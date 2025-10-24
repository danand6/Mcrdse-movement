const { connect, mongoose } = require('./db');
const { User, Post, Comment, Like } = require('./models');
const { seedPromptForToday } = require('./routes/prompt_today');

async function upsertUser(username, displayName) {
  return User.findOneAndUpdate(
    { username },
    {
      $set: { displayName },
      $setOnInsert: { username },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function upsertPost(authorId, payload) {
  const { text, mediaUrl } = payload;
  const update = {
    $setOnInsert: {
      authorId,
      text,
    },
  };

  if (mediaUrl) {
    update.$set = { mediaUrl };
  }

  return Post.findOneAndUpdate(
    { authorId, text },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true, timestamps: true }
  );
}

async function upsertComment(postId, authorId, text) {
  return Comment.findOneAndUpdate(
    { postId, authorId, text },
    {
      $setOnInsert: {
        postId,
        authorId,
        text,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, timestamps: true }
  );
}

async function upsertLike(postId, userId) {
  return Like.updateOne(
    { postId, userId },
    {
      $setOnInsert: {
        postId,
        userId,
      },
    },
    { upsert: true }
  );
}

async function refreshCounts(postId) {
  const [likesCount, commentsCount] = await Promise.all([
    Like.countDocuments({ postId }),
    Comment.countDocuments({ postId }),
  ]);
  await Post.updateOne({ _id: postId }, { $set: { likesCount, commentsCount } });
}

async function main() {
  await connect();

  const [alice, bob] = await Promise.all([
    upsertUser('alice', 'Alice Example'),
    upsertUser('bob', 'Bob Example'),
  ]);

  const postsSeed = [
    { author: 'alice', text: 'Started the day with gratitude journaling and a long walk.' },
    { author: 'alice', text: 'Cooked a colorful dinner packed with veggies tonight!' },
    { author: 'alice', text: 'Practiced deep breathing between meetings—game changer.' },
    { author: 'alice', text: 'Weekend hike reminder: always bring extra water.' },
    { author: 'bob', text: 'Shared a book recommendation with the community today.' },
    { author: 'bob', text: 'Tried a new 20-minute yoga flow—highly recommend.' },
    { author: 'bob', text: 'Made time for a screen-free hour before bed.' },
    { author: 'bob', text: 'Checked in on a friend and it made both our days brighter.' },
  ];

  const userMap = {
    alice,
    bob,
  };

  const postDocs = {};

  for (const post of postsSeed) {
    const doc = await upsertPost(userMap[post.author]._id, post);
    postDocs[post.text] = doc;
  }

  const commentsSeed = [
    {
      postText: 'Started the day with gratitude journaling and a long walk.',
      author: 'bob',
      text: 'Love this routine—need to borrow the walk idea!',
    },
    {
      postText: 'Shared a book recommendation with the community today.',
      author: 'alice',
      text: 'Adding it to my reading list, thanks Bob.',
    },
    {
      postText: 'Made time for a screen-free hour before bed.',
      author: 'alice',
      text: 'Curious what you did instead—sounds peaceful.',
    },
  ];

  for (const comment of commentsSeed) {
    const post = postDocs[comment.postText];
    if (!post) continue;
    await upsertComment(post._id, userMap[comment.author]._id, comment.text);
  }

  const likesSeed = [
    { postText: 'Started the day with gratitude journaling and a long walk.', users: ['alice', 'bob'] },
    { postText: 'Cooked a colorful dinner packed with veggies tonight!', users: ['bob'] },
    { postText: 'Shared a book recommendation with the community today.', users: ['alice'] },
    { postText: 'Made time for a screen-free hour before bed.', users: ['alice', 'bob'] },
  ];

  for (const likeEntry of likesSeed) {
    const post = postDocs[likeEntry.postText];
    if (!post) continue;
    for (const username of likeEntry.users) {
      await upsertLike(post._id, userMap[username]._id);
    }
  }

  await Promise.all(Object.values(postDocs).map((doc) => refreshCounts(doc._id)));
  await seedPromptForToday();

  console.log('Seed completed.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
