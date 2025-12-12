import React, { useState, useEffect } from 'react';
import { BlogPost, BlogStatus, Newsletter, NewsletterStatus, NewsletterSubscriber } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Mail,
  Users as UsersIcon,
  Send,
  Calendar as CalendarIcon,
  Search,
  Filter
} from 'lucide-react';

interface BlogCMSTabProps {
  onLogout?: () => void;
}

export const BlogCMSTab: React.FC<BlogCMSTabProps> = () => {
  const [activeSection, setActiveSection] = useState<'posts' | 'newsletters' | 'subscribers'>('posts');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BlogStatus | NewsletterStatus | 'all'>('all');

  // Load mock data (replace with actual API calls)
  useEffect(() => {
    // Load blog posts, newsletters, and subscribers
    loadBlogPosts();
    loadNewsletters();
    loadSubscribers();
  }, []);

  const loadBlogPosts = async () => {
    // TODO: Replace with actual API call
    setPosts([]);
  };

  const loadNewsletters = async () => {
    // TODO: Replace with actual API call
    setNewsletters([]);
  };

  const loadSubscribers = async () => {
    // TODO: Replace with actual API call
    setSubscribers([]);
  };

  const handleCreatePost = () => {
    const newPost: BlogPost = {
      id: `post-${Date.now()}`,
      title: '',
      slug: '',
      content: '',
      author_id: 'admin',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setEditingPost(newPost);
    setIsEditing(true);
  };

  const handleCreateNewsletter = () => {
    const newNewsletter: Newsletter = {
      id: `newsletter-${Date.now()}`,
      subject: '',
      content: '',
      from_name: 'Andora',
      from_email: 'hello@andorabrand.me',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setEditingNewsletter(newNewsletter);
    setIsEditing(true);
  };

  const handleSavePost = () => {
    if (!editingPost) return;

    // TODO: Save to backend
    const updated = posts.find(p => p.id === editingPost.id)
      ? posts.map(p => p.id === editingPost.id ? editingPost : p)
      : [...posts, editingPost];

    setPosts(updated);
    setIsEditing(false);
    setEditingPost(null);
  };

  const handleSaveNewsletter = () => {
    if (!editingNewsletter) return;

    // TODO: Save to backend
    const updated = newsletters.find(n => n.id === editingNewsletter.id)
      ? newsletters.map(n => n.id === editingNewsletter.id ? editingNewsletter : n)
      : [...newsletters, editingNewsletter];

    setNewsletters(updated);
    setIsEditing(false);
    setEditingNewsletter(null);
  };

  const handleDeletePost = (id: string) => {
    if (confirm('Delete this blog post?')) {
      setPosts(posts.filter(p => p.id !== id));
      // TODO: Delete from backend
    }
  };

  const handleDeleteNewsletter = (id: string) => {
    if (confirm('Delete this newsletter?')) {
      setNewsletters(newsletters.filter(n => n.id !== id));
      // TODO: Delete from backend
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredNewsletters = newsletters.filter(newsletter => {
    const matchesSearch = newsletter.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || newsletter.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Content Management</h1>
          <p className="text-sm text-slate-600 mt-1">Manage blog posts, newsletters, and subscribers</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSection('posts')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'posts'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="inline-block w-4 h-4 mr-2" />
          Blog Posts
        </button>
        <button
          onClick={() => setActiveSection('newsletters')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'newsletters'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail className="inline-block w-4 h-4 mr-2" />
          Newsletters
        </button>
        <button
          onClick={() => setActiveSection('subscribers')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSection === 'subscribers'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UsersIcon className="inline-block w-4 h-4 mr-2" />
          Subscribers ({subscribers.filter(s => s.is_active).length})
        </button>
      </div>

      {/* Blog Posts Section */}
      {activeSection === 'posts' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BlogStatus | 'all')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <Button onClick={handleCreatePost} className="flex items-center">
              <Plus size={16} className="mr-2" />
              New Post
            </Button>
          </div>

          {/* Posts List */}
          <div className="glass-effect rounded-lg border border-primary-500/20">
            {filteredPosts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No blog posts yet. Create your first post!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredPosts.map(post => (
                  <div key={post.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{post.title || 'Untitled'}</h3>
                        <p className="text-sm text-slate-500 mt-1">{post.excerpt || 'No excerpt'}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            post.status === 'published' ? 'bg-green-100 text-green-700' :
                            post.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {post.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {post.view_count || 0} views
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPost(post);
                            setIsEditing(true);
                          }}
                        >
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Newsletters Section */}
      {activeSection === 'newsletters' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search newsletters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as NewsletterStatus | 'all')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
            </select>
            <Button onClick={handleCreateNewsletter} className="flex items-center">
              <Plus size={16} className="mr-2" />
              New Newsletter
            </Button>
          </div>

          {/* Newsletters List */}
          <div className="glass-effect rounded-lg border border-primary-500/20">
            {filteredNewsletters.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No newsletters yet. Create your first newsletter!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredNewsletters.map(newsletter => (
                  <div key={newsletter.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{newsletter.subject || 'Untitled'}</h3>
                        <p className="text-sm text-slate-500 mt-1">{newsletter.preview_text || 'No preview'}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            newsletter.status === 'sent' ? 'bg-green-100 text-green-700' :
                            newsletter.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {newsletter.status}
                          </span>
                          {newsletter.recipient_count && (
                            <span className="text-xs text-slate-500">
                              {newsletter.recipient_count} recipients
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingNewsletter(newsletter);
                            setIsEditing(true);
                          }}
                        >
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNewsletter(newsletter.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscribers Section */}
      {activeSection === 'subscribers' && (
        <div className="space-y-4">
          <div className="glass-effect rounded-lg border border-primary-500/20 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-green-700">Active Subscribers</p>
                <p className="text-2xl font-bold text-green-900 mt-2">
                  {subscribers.filter(s => s.is_active).length}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm font-medium text-red-700">Unsubscribed</p>
                <p className="text-2xl font-bold text-red-900 mt-2">
                  {subscribers.filter(s => !s.is_active).length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-700">Total</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">{subscribers.length}</p>
              </div>
            </div>

            {subscribers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No subscribers yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subscribers.map(subscriber => (
                  <div
                    key={subscriber.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{subscriber.email}</p>
                      {subscriber.name && (
                        <p className="text-sm text-slate-500">{subscriber.name}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      subscriber.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {subscriber.is_active ? 'Active' : 'Unsubscribed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {isEditing && editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {editingPost.id.startsWith('post-') && posts.find(p => p.id === editingPost.id) ? 'Edit' : 'New'} Blog Post
            </h2>

            <div className="space-y-4">
              <Input
                label="Title"
                value={editingPost.title}
                onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                placeholder="Enter post title"
              />

              <Input
                label="Slug"
                value={editingPost.slug}
                onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                placeholder="post-url-slug"
              />

              <Textarea
                label="Excerpt"
                value={editingPost.excerpt || ''}
                onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />

              <Textarea
                label="Content"
                value={editingPost.content}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                placeholder="Write your content here (Markdown supported)"
                rows={12}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                  <select
                    value={editingPost.status}
                    onChange={(e) => setEditingPost({ ...editingPost, status: e.target.value as BlogStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <Input
                  label="Featured Image URL"
                  value={editingPost.featured_image || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, featured_image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditingPost(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSavePost}>
                Save Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Newsletter Modal */}
      {isEditing && editingNewsletter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {editingNewsletter.id.startsWith('newsletter-') && newsletters.find(n => n.id === editingNewsletter.id) ? 'Edit' : 'New'} Newsletter
            </h2>

            <div className="space-y-4">
              <Input
                label="Subject"
                value={editingNewsletter.subject}
                onChange={(e) => setEditingNewsletter({ ...editingNewsletter, subject: e.target.value })}
                placeholder="Newsletter subject line"
              />

              <Textarea
                label="Preview Text"
                value={editingNewsletter.preview_text || ''}
                onChange={(e) => setEditingNewsletter({ ...editingNewsletter, preview_text: e.target.value })}
                placeholder="Brief preview (shown in email clients)"
                rows={2}
              />

              <Textarea
                label="Content"
                value={editingNewsletter.content}
                onChange={(e) => setEditingNewsletter({ ...editingNewsletter, content: e.target.value })}
                placeholder="Write your newsletter content (HTML supported)"
                rows={12}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="From Name"
                  value={editingNewsletter.from_name}
                  onChange={(e) => setEditingNewsletter({ ...editingNewsletter, from_name: e.target.value })}
                />

                <Input
                  label="From Email"
                  value={editingNewsletter.from_email}
                  onChange={(e) => setEditingNewsletter({ ...editingNewsletter, from_email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                <select
                  value={editingNewsletter.status}
                  onChange={(e) => setEditingNewsletter({ ...editingNewsletter, status: e.target.value as NewsletterStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="sent">Sent</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditingNewsletter(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveNewsletter}>
                Save Newsletter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
