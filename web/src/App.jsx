import { useCallback, useEffect, useMemo, useState } from 'react';

const defaultApiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:4000').replace(/\/+$/, '');

export default function App() {
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [draftApiBase, setDraftApiBase] = useState(defaultApiBase);
  const [user, setUser] = useState(null);

  const [prompt, setPrompt] = useState(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState('');

  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState('');

  const request = useCallback(
    async (path, options = {}) => {
      const headers = { ...(options.headers || {}) };
      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${apiBase}${path}`, {
        credentials: 'include',
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          (typeof data === 'object' && data?.message) || response.statusText || 'Request failed';
        throw new Error(message);
      }

      return data;
    },
    [apiBase]
  );

  const loadPrompt = useCallback(async () => {
    setPromptLoading(true);
    setPromptError('');
    try {
      const data = await request('/prompt/today');
      setPrompt(data);
    } catch (err) {
      setPrompt(null);
      setPromptError(err.message);
    } finally {
      setPromptLoading(false);
    }
  }, [request]);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError('');
    try {
      const data = await request('/posts');
      setPosts(data.items ?? []);
    } catch (err) {
      setPosts([]);
      setFeedError(err.message);
    } finally {
      setFeedLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadPrompt();
    loadFeed();
  }, [loadPrompt, loadFeed]);

  const handleApiSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const normalized = draftApiBase.trim().replace(/\/+$/, '');
      if (!normalized) return;
      if (normalized === apiBase) return;
      setDraftApiBase(normalized);
      setApiBase(normalized);
      setUser(null);
    },
    [draftApiBase, apiBase]
  );

  const handleLogin = useCallback(
    async (username) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      setUser(data.user);
      await loadFeed();
      return data.user;
    },
    [request, loadFeed]
  );

  const handleCreatePost = useCallback(
    async ({ text, mediaUrl }) => {
      if (!user) {
        throw new Error('Please log in to post.');
      }
      const payload = { text };
      if (mediaUrl) {
        payload.mediaUrl = mediaUrl;
      }
      await request('/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadFeed();
    },
    [user, request, loadFeed]
  );

  const handleLike = useCallback(
    async (postId) => {
      if (!user) {
        throw new Error('Please log in to like posts.');
      }
      await request(`/posts/${postId}/like`, { method: 'POST' });
      await loadFeed();
    },
    [user, request, loadFeed]
  );

  const handleComment = useCallback(
    async (postId, text) => {
      if (!user) {
        throw new Error('Please log in to comment.');
      }
      await request(`/posts/${postId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      await loadFeed();
    },
    [user, request, loadFeed]
  );

  const promptContent = useMemo(() => {
    if (promptLoading) return 'Loading prompt…';
    if (promptError) return `Unable to load prompt: ${promptError}`;
    if (!prompt || !prompt.text) return 'No prompt has been set for today yet.';
    return prompt.text;
  }, [prompt, promptLoading, promptError]);

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <h1 className="app-title">MCRDSE Mindful Check-In</h1>
          <p className="tagline">
            Take a gentle moment to share, reflect, and celebrate small wins.
          </p>
        </div>
        <div className="header-actions">
          <LoginPanel user={user} onLogin={handleLogin} />
          <ApiConfig
            value={draftApiBase}
            current={apiBase}
            onChange={setDraftApiBase}
            onSubmit={handleApiSubmit}
          />
        </div>
      </header>

      <main className="app-main">
        <section className="content-layout">
          <div className="main-column">
            <PromptCard
              text={promptContent}
              loading={promptLoading}
              onRefresh={loadPrompt}
            />
            <Feed
              className="feed-card"
              posts={posts}
              loading={feedLoading}
              error={feedError}
              onRefresh={loadFeed}
              onLike={handleLike}
              onComment={handleComment}
              user={user}
            />
          </div>

          <aside className="side-panel">
            <PostComposer
              className="side-card"
              onSubmit={handleCreatePost}
              disabled={!user}
            />
            <SupportCard />
          </aside>
        </section>
      </main>
    </>
  );
}

function ApiConfig({ value, current, onChange, onSubmit }) {
  return (
    <form className="api-config" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="api-input">
        API Base URL
      </label>
      <input
        id="api-input"
        className="api-input"
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="http://localhost:4000"
      />
      <button type="submit">Set</button>
      <small>Using: {current}</small>
    </form>
  );
}

function LoginPanel({ user, onLogin }) {
  const [username, setUsername] = useState('');
  const [feedback, setFeedback] = useState({ message: '', tone: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim()) return;
    setSubmitting(true);
    setFeedback({ message: 'Breathing in… logging you in.', tone: '' });
    try {
      const loggedIn = await onLogin(username.trim());
      setFeedback({
        message: `Welcome back, ${loggedIn.displayName}. You’re safe here.`,
        tone: '',
      });
      setUsername('');
    } catch (err) {
      setFeedback({ message: err.message, tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-panel">
      {user ? (
        <>
          <p className="login-greeting">
            Hi {user.displayName}, thanks for checking in today.
          </p>
          <p className="login-subtext muted">Your presence helps our community feel supported.</p>
        </>
      ) : (
        <>
          <p className="login-greeting">Take a mindful breath and join the conversation.</p>
          <form onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="login-username">
              Username
            </label>
            <div className="login-form-row">
              <input
                id="login-username"
                name="username"
                placeholder="Try “alice” or “bob”"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <button type="submit" disabled={submitting}>
                {submitting ? 'Logging in…' : 'Login'}
              </button>
            </div>
          </form>
        </>
      )}
      <p className={`login-feedback ${feedback.tone === 'error' ? 'error' : ''}`}>
        {feedback.message}
      </p>
    </div>
  );
}

function PromptCard({ className = '', text, loading, onRefresh }) {
  const cardClass = ['card', 'prompt-card', className].filter(Boolean).join(' ');
  return (
    <section className={cardClass}>
      <div className="card-header">
        <h2>Prompt of the Day</h2>
        <button
          className="btn-secondary"
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh prompt"
        >
          &#x21bb;
        </button>
      </div>
      <p className={`prompt-text ${loading ? 'muted' : ''}`}>{text}</p>
    </section>
  );
}

function PostComposer({ className = '', onSubmit, disabled }) {
  const cardClass = ['card', className].filter(Boolean).join(' ');
  const [text, setText] = useState('');
  const [media, setMedia] = useState('');
  const [feedback, setFeedback] = useState({ message: '', tone: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    const trimmedMedia = media.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setFeedback({ message: 'Sharing your thoughts…', tone: '' });
    try {
      await onSubmit({ text: trimmed, mediaUrl: trimmedMedia || undefined });
      setText('');
      setMedia('');
      setFeedback({ message: 'Post published – thank you for sharing!', tone: '' });
    } catch (err) {
      setFeedback({ message: err.message, tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={cardClass}>
      <h2>Share a Gentle Check-In</h2>
      <p className="muted">Celebrate a win, name a feeling, or note what you need today.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="post-text">Post Text</label>
        <textarea
          id="post-text"
          name="text"
          rows={3}
          maxLength={500}
          placeholder="What nurtured your mind or body today?"
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
          disabled={disabled}
        />
        <label htmlFor="post-media" className="muted">
          Media URL (optional)
        </label>
        <input
          id="post-media"
          name="mediaUrl"
          type="url"
          placeholder="https://example.com/photo.jpg"
          value={media}
          onChange={(event) => setMedia(event.target.value)}
          disabled={disabled}
        />
        <button className="btn-primary" type="submit" disabled={disabled || submitting}>
          {submitting ? 'Publishing…' : 'Publish'}
        </button>
      </form>
      <p className={`status-message ${feedback.tone === 'error' ? 'error' : ''}`}>
        {disabled ? 'Log in to share your reflections.' : feedback.message}
      </p>
    </section>
  );
}

function Feed({ className = '', posts, loading, error, onRefresh, onLike, onComment, user }) {
  const cardClass = ['card', 'feed-card', className].filter(Boolean).join(' ');
  return (
    <section className={cardClass}>
      <div className="card-header">
        <div>
          <h2>Community Feed</h2>
          <p className="muted">
            Take inspiration from others’ check-ins. Small steps matter.
          </p>
        </div>
        <button
          className="btn-secondary"
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh feed"
        >
          &#x21bb;
        </button>
      </div>
      {loading && <p className="muted">Loading feed…</p>}
      {error && <p className="status-message error">Failed to load posts: {error}</p>}
      {!loading && !error && posts.length === 0 && (
        <p className="muted">No posts yet. Share something to get the conversation going!</p>
      )}
      <div className="feed">
        {posts.map((post) => (
          <PostItem key={post.id} post={post} onLike={onLike} onComment={onComment} user={user} />
        ))}
      </div>
    </section>
  );
}

function PostItem({ post, onLike, onComment, user }) {
  const [comment, setComment] = useState('');
  const [feedback, setFeedback] = useState({ message: '', tone: '' });
  const [liking, setLiking] = useState(false);
  const [commenting, setCommenting] = useState(false);

  const handleLike = async () => {
    if (!user) {
      setFeedback({ message: 'Log in to like posts.', tone: 'error' });
      return;
    }
    setLiking(true);
    setFeedback({ message: '', tone: '' });
    try {
      await onLike(post.id);
      setFeedback({ message: 'Post liked!', tone: '' });
    } catch (err) {
      setFeedback({ message: err.message, tone: 'error' });
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    const text = comment.trim();
    if (!text) return;
    if (!user) {
      setFeedback({ message: 'Log in to comment.', tone: 'error' });
      return;
    }
    setCommenting(true);
    setFeedback({ message: 'Posting comment…', tone: '' });
    try {
      await onComment(post.id, text);
      setComment('');
      setFeedback({ message: 'Comment added!', tone: '' });
    } catch (err) {
      setFeedback({ message: err.message, tone: 'error' });
    } finally {
      setCommenting(false);
    }
  };

  return (
    <article className="post">
      <header className="post-header">
        <span className="post-author">
          {post.author.displayName} (@{post.author.username})
        </span>
        <time className="post-timestamp">{formatTimestamp(post.createdAt)}</time>
      </header>
      <p className="post-text">{post.text}</p>
      {post.mediaUrl ? (
        <p className="post-media">
          Media:{' '}
          <a href={post.mediaUrl} target="_blank" rel="noreferrer">
            {post.mediaUrl}
          </a>
        </p>
      ) : null}
      <div className="post-actions">
        <span>
          {post.likesCount} like{post.likesCount === 1 ? '' : 's'} • {post.commentsCount}{' '}
          comment{post.commentsCount === 1 ? '' : 's'}
        </span>
        <button className="btn-secondary like-btn" type="button" onClick={handleLike} disabled={liking}>
          {liking ? 'Liking…' : '❤️ Like'}
        </button>
      </div>
      <div className="comments">
        {post.comments?.length ? (
          post.comments.map((item) => <CommentItem key={item.id} comment={item} />)
        ) : (
          <p className="muted">No comments yet.</p>
        )}
      </div>
      <form className="comment-form" onSubmit={handleComment}>
        <label className="sr-only" htmlFor={`comment-${post.id}`}>
          Add a comment
        </label>
        <div className="form-row">
          <input
            id={`comment-${post.id}`}
            type="text"
            name="text"
            placeholder="Offer encouragement…"
            maxLength={300}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={commenting}
          />
          <button className="btn-primary" type="submit" disabled={commenting}>
            {commenting ? 'Posting…' : 'Reply'}
          </button>
        </div>
      </form>
      <p className={`status-message ${feedback.tone === 'error' ? 'error' : ''}`}>
        {feedback.message}
      </p>
    </article>
  );
}

function CommentItem({ comment }) {
  return (
    <div className="comment">
      <strong>{comment.author}</strong>
      <p>{comment.text}</p>
      <time>{formatTimestamp(comment.createdAt)}</time>
    </div>
  );
}

function SupportCard() {
  return (
    <section className="card side-card support-card">
      <h2>Gentle Reminders</h2>
      <ul>
        <li>Pause for a slow breath before you write or respond.</li>
        <li>Small victories count—share them proudly.</li>
        <li>If today feels heavy, it’s okay to simply observe.</li>
      </ul>
    </section>
  );
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}
