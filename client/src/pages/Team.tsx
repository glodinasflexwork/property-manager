import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { UserPlus, Users, Mail, Trash2, Shield, Eye, Edit, Crown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Team() {
  const { user, isAuthenticated } = useAuth();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  // Get or create organization
  const { data: organization } = trpc.organizations.getOrCreate.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Get team members
  const { data: teamMembers, isLoading } = trpc.team.list.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  // Invite team member mutation
  const inviteMember = trpc.team.invite.useMutation({
    onSuccess: () => {
      toast.success("Team member invited successfully!");
      setIsInviteDialogOpen(false);
      utils.team.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Remove team member mutation
  const removeMember = trpc.team.remove.useMutation({
    onSuccess: () => {
      toast.success("Team member removed successfully!");
      utils.team.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    inviteMember.mutate({
      organizationId: organization!.id,
      email: formData.get("email") as string,
      role: formData.get("role") as "owner" | "administrator" | "editor" | "viewer",
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "administrator":
        return <Shield className="h-4 w-4" />;
      case "editor":
        return <Edit className="h-4 w-4" />;
      case "viewer":
        return <Eye className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "administrator":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "editor":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "viewer":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "owner":
        return "Full access to all features and settings";
      case "administrator":
        return "Can manage properties, invoices, and team members";
      case "editor":
        return "Can add and edit properties and invoices";
      case "viewer":
        return "Can only view properties and reports";
      default:
        return "";
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Pending";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  // Check if current user is owner or admin
  const currentUserMember = teamMembers?.find(m => m.userId === user?.id);
  const canManageTeam = (currentUserMember?.role === "owner" || currentUserMember?.role === "administrator") ?? false;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please log in to view team members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage team members and permissions</p>
        </div>
        {canManageTeam && (
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="colleague@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select name="role" defaultValue="viewer" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrator">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <div>
                            <p className="font-medium">Administrator</p>
                            <p className="text-xs text-muted-foreground">
                              Manage properties, invoices, and team
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          <div>
                            <p className="font-medium">Editor</p>
                            <p className="text-xs text-muted-foreground">
                              Add and edit properties and invoices
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <div>
                            <p className="font-medium">Viewer</p>
                            <p className="text-xs text-muted-foreground">
                              View-only access to properties and reports
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? "Inviting..." : "Send Invitation"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teamMembers?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {teamMembers?.filter(m => m.acceptedAt).length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {teamMembers?.filter(m => !m.acceptedAt).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getRoleColor(currentUserMember?.role || "viewer")}>
              <span className="flex items-center gap-1">
                {getRoleIcon(currentUserMember?.role || "viewer")}
                {currentUserMember?.role ? currentUserMember.role.charAt(0).toUpperCase() + currentUserMember.role.slice(1) : "Viewer"}
              </span>
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {getRoleDescription(currentUserMember?.role || "viewer")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 bg-muted" />
            </Card>
          ))}
        </div>
      ) : teamMembers && teamMembers.length > 0 ? (
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      {getRoleIcon(member.role)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{member.userName || "Pending User"}</h3>
                        <Badge className={getRoleColor(member.role)}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                        {!member.acceptedAt && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {member.userEmail || "Email not available"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Joined: {formatDate(member.acceptedAt)}
                        </span>
                        <span>•</span>
                        <span>
                          Invited by ID: {member.invitedBy || "System"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canManageTeam && member.userId !== user?.id && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${member.userName || "this member"}?`)) {
                          removeMember.mutate({ id: member.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <Users className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No team members yet</h3>
            <p className="text-muted-foreground">
              Invite team members to collaborate on property management
            </p>
            {canManageTeam && (
              <Button onClick={() => setIsInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Role Permissions Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold">Owner</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                  <li>• Full access to all features</li>
                  <li>• Manage billing and subscriptions</li>
                  <li>• Delete organization</li>
                  <li>• Cannot be removed</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold">Administrator</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                  <li>• Manage properties and invoices</li>
                  <li>• Invite and remove team members</li>
                  <li>• View all reports and analytics</li>
                  <li>• Cannot manage billing</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold">Editor</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                  <li>• Add and edit properties</li>
                  <li>• Add and edit invoices</li>
                  <li>• View reports and analytics</li>
                  <li>• Cannot manage team</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                  <h4 className="font-semibold">Viewer</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                  <li>• View properties and details</li>
                  <li>• View invoices and expenses</li>
                  <li>• View reports and analytics</li>
                  <li>• Cannot make any changes</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
