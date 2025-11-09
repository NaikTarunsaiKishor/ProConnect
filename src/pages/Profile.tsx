import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Camera } from 'lucide-react';
import PostCard from '@/components/PostCard';

const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', headline: '', bio: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const isOwnProfile = user?.id === userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: userPosts = [] } = useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            headline
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const handleEdit = () => {
    if (profile) {
      setEditData({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
      });
      setIsEditing(true);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleSave = async () => {
    setIsUpdating(true);

    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user?.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          headline: editData.headline,
          bio: editData.bio,
          avatar_url: avatarUrl,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      setAvatarFile(null);
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card className="p-8 shadow-lg border-border/50">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-36 w-36 ring-4 ring-background shadow-xl">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {isEditing && (
                <label htmlFor="avatar-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    Change Photo
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              )}
            </div>

            <div className="flex-1 space-y-5">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Full Name</Label>
                    <Input
                      value={editData.full_name}
                      onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Headline</Label>
                    <Input
                      value={editData.headline}
                      onChange={(e) => setEditData({ ...editData, headline: e.target.value })}
                      placeholder="Professional headline"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Bio</Label>
                    <Textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      placeholder="Tell us about yourself"
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSave} disabled={isUpdating} className="shadow-sm">
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h1 className="text-3xl font-bold">{profile?.full_name}</h1>
                    {profile?.headline && (
                      <p className="text-muted-foreground mt-2 text-base">{profile.headline}</p>
                    )}
                  </div>
                  {profile?.bio && (
                    <p className="text-base leading-relaxed bg-secondary/30 p-4 rounded-lg">{profile.bio}</p>
                  )}
                  {isOwnProfile && (
                    <Button onClick={handleEdit} variant="outline" className="shadow-sm hover:shadow-md transition-all">
                      Edit Profile
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Posts</span>
            <span className="text-sm font-normal text-muted-foreground">({userPosts.length})</span>
          </h2>
          {userPosts.length === 0 ? (
            <Card className="p-12 text-center shadow-md border-border/50">
              <p className="text-muted-foreground text-lg">No posts yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Share something to get started!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
