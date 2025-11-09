import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Image, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const CreatePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile) {
      toast.error('Please add some content or an image');
      return;
    }

    setIsPosting(true);

    try {
      let imageUrl = null;

      // Upload image if present
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,
          content: content.trim(),
          image_url: imageUrl,
        });

      if (postError) throw postError;

      toast.success('Post created successfully!');
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="p-6 shadow-md hover:shadow-lg transition-shadow border-border/50">
      <div className="flex gap-4">
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-4">
          <Textarea
            placeholder="Share your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 text-base placeholder:text-muted-foreground/60"
          />
          
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-border/50">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full max-h-96 object-cover"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-3 right-3 shadow-lg"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
              >
                Remove
              </Button>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <label htmlFor="image-upload">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-all"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <Image className="h-5 w-5" />
                <span className="font-medium">Photo</span>
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
            
            <Button
              onClick={handlePost}
              disabled={isPosting || (!content.trim() && !imageFile)}
              className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isPosting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CreatePost;
