import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Key, 
  Trash2, 
  Shield, 
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';

// Safe user type without password hash
type SafeUser = {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
  createdBy?: string;
};

interface UserManagementProps {
  onLogout: () => void;
}

export default function UserManagement({ onLogout }: UserManagementProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const getUsers = useAuthStore((state) => state.getUsers);
  const createUser = useAuthStore((state) => state.createUser);
  const deleteUser = useAuthStore((state) => state.deleteUser);
  const changePassword = useAuthStore((state) => state.changePassword);
  const logout = useAuthStore((state) => state.logout);

  // Get users safely (without password hashes)
  const users = getUsers();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  
  // Create user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Change password form
  const [newPasswordChange, setNewPasswordChange] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  const handleCreateUser = () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setErrorMessage('Username and password are required');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    const success = createUser(newUsername.trim(), newPassword, newRole);
    
    if (success) {
      setSuccessMessage(`User "${newUsername}" created successfully`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setShowCreateDialog(false);
    } else {
      setErrorMessage('Failed to create user. Username may already exist.');
    }
  };

  const handleChangePassword = () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPasswordChange.trim()) {
      setErrorMessage('New password is required');
      return;
    }

    if (newPasswordChange.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    if (newPasswordChange !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    const userId = selectedUser?.id || currentUser?.id;
    if (!userId) return;

    const success = changePassword(userId, newPasswordChange);
    
    if (success) {
      setSuccessMessage('Password changed successfully');
      setNewPasswordChange('');
      setConfirmPassword('');
      setShowPasswordDialog(false);
      setSelectedUser(null);
    } else {
      setErrorMessage('Failed to change password');
    }
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
      const success = deleteUser(userId);
      if (success) {
        setSuccessMessage(`User "${username}" deleted successfully`);
      } else {
        setErrorMessage('Failed to delete user');
      }
    }
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const openPasswordDialog = (user?: SafeUser) => {
    setSelectedUser(user || null);
    setNewPasswordChange('');
    setConfirmPassword('');
    setErrorMessage('');
    setShowPasswordDialog(true);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleLogout}>
            <LogOut className="w-3 h-3 mr-1" />
            Logout
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-3 space-y-3">
        {/* Current User Info */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              {currentUser?.role === 'admin' ? (
                <Shield className="w-4 h-4 text-primary" />
              ) : (
                <UserIcon className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{currentUser?.username}</span>
                <Badge variant={currentUser?.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                  {currentUser?.role}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Logged in since {new Date().toLocaleTimeString()}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openPasswordDialog()}>
              <Key className="w-3 h-3 mr-1" />
              Change Password
            </Button>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600 dark:text-green-400">{successMessage}</AlertDescription>
          </Alert>
        )}
        {errorMessage && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <>
            <div className="flex items-center justify-between">
              <h4 className="section-header mb-0">All Users ({users.length})</h4>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs">
                    <UserPlus className="w-3 h-3 mr-1" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to the system. They will be able to log in with these credentials.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        placeholder="Enter username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Enter password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newRole} onValueChange={(v: 'admin' | 'user') => setNewRole(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateUser}>Create User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 rounded-lg border smooth-transition ${
                      user.id === currentUser?.id
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-muted/30 hover:bg-muted/50 border-border/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${
                          user.role === 'admin' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                        }`}>
                          {user.role === 'admin' ? (
                            <Shield className="w-3.5 h-3.5 text-yellow-500" />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{user.username}</span>
                            <Badge 
                              variant={user.role === 'admin' ? 'default' : 'secondary'} 
                              className="text-[10px]"
                            >
                              {user.role}
                            </Badge>
                            {user.id === currentUser?.id && (
                              <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                            {user.createdBy && ` by ${user.createdBy}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openPasswordDialog(user)}
                          title="Change Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </Button>
                        {user.id !== currentUser?.id && user.id !== 'admin-001' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Non-admin view */}
        {!isAdmin && (
          <div className="text-center py-8 text-muted-foreground">
            <UserIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Standard user account</p>
            <p className="text-xs">Contact an administrator for account changes</p>
          </div>
        )}

        {/* Change Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                {selectedUser 
                  ? `Change password for user "${selectedUser.username}"`
                  : 'Enter a new password for your account'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showChangePassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPasswordChange}
                    onChange={(e) => setNewPasswordChange(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                  >
                    {showChangePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type={showChangePassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
              <Button onClick={handleChangePassword}>Change Password</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
