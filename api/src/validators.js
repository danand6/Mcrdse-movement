const { z } = require('zod');

const PostInput = z.object({
  text: z.string().min(1).max(500),
  mediaUrl: z.string().url().optional(),
});

const CommentInput = z.object({
  text: z.string().min(1).max(300),
});

module.exports = {
  PostInput,
  CommentInput,
};
