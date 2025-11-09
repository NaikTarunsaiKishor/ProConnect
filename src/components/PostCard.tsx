import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Heart, MessageCircle, MoreVertical, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    headline: string | null;
  };
}

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch likes
  const { data: likes = [] } = useQuery({
    queryKey: ['likes', post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', post.id);
      return data || [];
    },
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
  });

  const isLiked = likes.some((like) => like.user_id === user?.id);
  const isOwner = post.user_id === user?.id;

  const handleLike = async () => {
    if (!user) return;

    if (isLiked) {
      const like = likes.find((l) => l.user_id === user.id);
      if (like) {
        await supabase.from('likes').delete().eq('id', like.id);
      }
    } else {
      await supabase.from('likes').insert({
        user_id: user.id,
        post_id: post.id,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['likes', post.id] });
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;

    await supabase.from('comments').insert({
      user_id: user.id,
      post_id: post.id,
      content: commentText.trim(),
    });

    setCommentText('');
    queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
  };

  const handleEdit = async () => {
    if (!editedContent.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }

    const { error } = await supabase
      .from('posts')
      .update({ content: editedContent.trim() })
      .eq('id', post.id);

    if (error) {
      toast.error('Failed to update post');
    } else {
      toast.success('Post updated successfully');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id);

    if (error) {
      toast.error('Failed to delete post');
    } else {
      toast.success('Post deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="p-6 shadow-md hover:shadow-lg transition-all hover-lift border-border/50">
        <div className="flex gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
            <AvatarImage src={post.profiles.avatar_url || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {post.profiles.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">{post.profiles.full_name}</h3>
                {post.profiles.headline && (
                  <p className="text-sm text-muted-foreground mt-0.5">{post.profiles.headline}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-secondary/80">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit post
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive cursor-pointer focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="mt-4">
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleEdit} className="shadow-sm">Save changes</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setIsEditing(false);
                      setEditedContent(post.content);
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-base whitespace-pre-wrap leading-relaxed">{post.content}</p>
              )}
              
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Post content"
                  className="mt-4 rounded-xl max-h-[500px] w-full object-cover border border-border/50"
                />
              )}
            </div>

            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center gap-2 hover:bg-destructive/10 transition-all ${isLiked ? 'text-destructive' : 'hover:text-destructive'}`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{likes.length}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{comments.length}</span>
              </Button>
            </div>

            {showComments && (
              <div className="mt-5 space-y-4 border-t border-border/50 pt-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                      <AvatarImage src={comment.profiles?.avatar_url || ''} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                        {comment.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-secondary/80 rounded-xl p-3 shadow-sm">
                      <p className="text-sm font-semibold">{comment.profiles?.full_name}</p>
                      <p className="text-sm mt-1 leading-relaxed">{comment.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-3 pt-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[70px] resize-none"
                  />
                  <Button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    size="sm"
                    className="self-end shadow-sm"
                  >
                    Post
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PostCard;
