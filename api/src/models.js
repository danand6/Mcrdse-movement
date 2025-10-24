const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const User = model('User', new Schema({
  username: { type: String, unique: true, required: true },
  displayName: { type: String, required: true }
}, { timestamps: true }));

const Post = model('Post', new Schema({
  authorId: { type: Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 500 },
  mediaUrl: { type: String },
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 }
}, { timestamps: true }));

const Like = model('Like', new Schema({
  postId: { type: Types.ObjectId, ref: 'Post', required: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true }));
Like.schema.index({ postId: 1, userId: 1 }, { unique: true });

const Comment = model('Comment', new Schema({
  postId: { type: Types.ObjectId, ref: 'Post', required: true },
  authorId: { type: Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 300 }
}, { timestamps: true }));
Comment.schema.index({ postId: 1, createdAt: -1 });

const Prompt = model('Prompt', new Schema({
  date: { type: String, unique: true, required: true }, // 'YYYY-MM-DD'
  text: { type: String, required: true },
  source: { type: String, enum: ['local','llm'], default: 'local' }
}));

module.exports = { User, Post, Like, Comment, Prompt };
