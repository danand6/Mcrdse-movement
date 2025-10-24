const router = require('express').Router();
const { requireUser } = require('../auth');
const { Post, Like, Comment } = require('../models');
const { PostInput, CommentInput } = require('../validators');
const { Types } = require('mongoose');

// Create post
router.post('/', requireUser, async (req, res) => {
  const parsed = PostInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'invalid', issues: parsed.error.issues });

  const doc = await Post.create({
    authorId: req.user._id,
    text: parsed.data.text,
    mediaUrl: parsed.data.mediaUrl
  });
  res.json(await hydratePost(doc));
});

// Feed (cursor by _id)
router.get('/', async (req, res) => {
  const limit = 10;
  const cursor = req.query.cursor;
  const q = cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {};
  const items = await Post.find(q).sort({ _id: -1 }).limit(limit);
  const hydrated = await Promise.all(items.map(hydratePost));
  const nextCursor = items.length === limit ? String(items[items.length-1]._id) : null;
  res.json({ items: hydrated, nextCursor });
});

// Like (idempotent)
router.post('/:id/like', requireUser, async (req, res) => {
  try { await Like.create({ postId: req.params.id, userId: req.user._id }); } catch {}
  const count = await Like.countDocuments({ postId: req.params.id });
  await Post.updateOne({ _id: req.params.id }, { $set: { likesCount: count } });
  res.json({ likesCount: count });
});

// Comment
router.post('/:id/comment', requireUser, async (req, res) => {
  const parsed = CommentInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'invalid', issues: parsed.error.issues });
  const c = await Comment.create({ postId: req.params.id, authorId: req.user._id, text: parsed.data.text });
  const count = await Comment.countDocuments({ postId: req.params.id });
  await Post.updateOne({ _id: req.params.id }, { $set: { commentsCount: count } });
  const populated = { id: c._id, text: c.text, author: req.user.displayName, createdAt: c.createdAt };
  res.json({ comment: populated, commentsCount: count });
});

async function hydratePost(p) {
  await p.populate('authorId', 'displayName username');
  const comments = await Comment.find({ postId: p._id }).sort({ createdAt: -1 }).limit(5).populate('authorId', 'displayName');
  return {
    id: p._id,
    text: p.text,
    mediaUrl: p.mediaUrl,
    createdAt: p.createdAt,
    author: { displayName: p.authorId.displayName, username: p.authorId.username },
    likesCount: p.likesCount,
    commentsCount: p.commentsCount,
    comments: comments.map(c => ({ id: c._id, text: c.text, author: c.authorId.displayName, createdAt: c.createdAt }))
  };
}

module.exports = router;
