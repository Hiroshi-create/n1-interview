import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/context/components/ui/dialog";
import { Button } from "@/context/components/ui/button";
import { Input } from "@/context/components/ui/input";
import { Label } from "@/context/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/context/components/ui/select";
import { positions } from '@/context/components/lists';

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newUser: {
    email: string;
    password: string;
    userName: string[];
    role: string;
    gender: string;
    organizationPosition: string;
    userPhoneNumber: string;
  };
  setNewUser: React.Dispatch<React.SetStateAction<{
    email: string;
    password: string;
    userName: string[];
    role: string;
    gender: string;
    organizationPosition: string;
    userPhoneNumber: string;
  }>>;
  handleAddUser: () => void;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ isOpen, onClose, newUser, setNewUser, handleAddUser }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しいユーザーを追加</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">メールアドレス</Label>
            <Input
              id="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">パスワード</Label>
            <Input
              id="password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">姓</Label>
            <Input
              id="lastName"
              value={newUser.userName[0]}
              onChange={(e) => setNewUser({ ...newUser, userName: [e.target.value, newUser.userName[1]] })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">名</Label>
            <Input
              id="firstName"
              value={newUser.userName[1]}
              onChange={(e) => setNewUser({ ...newUser, userName: [newUser.userName[0], e.target.value] })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">ロール</Label>
            <Select
              value={newUser.role}
              onValueChange={(value) => setNewUser({ ...newUser, role: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="ロールを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">管理者</SelectItem>
                <SelectItem value="editor">編集者</SelectItem>
                <SelectItem value="viewer">閲覧者</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gender" className="text-right">性別</Label>
            <Select
              value={newUser.gender}
              onValueChange={(value) => setNewUser({ ...newUser, gender: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="性別を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">男性</SelectItem>
                <SelectItem value="female">女性</SelectItem>
                <SelectItem value="other">その他</SelectItem>
                <SelectItem value="notAnswer">回答しない</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="organizationPosition" className="text-right">組織内役職</Label>
            <Select
              value={newUser.organizationPosition}
              onValueChange={(value) => setNewUser({ ...newUser, organizationPosition: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="役職を選択" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position} value={position}>{position}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="userPhoneNumber" className="text-right">電話番号</Label>
            <Input
              id="userPhoneNumber"
              value={newUser.userPhoneNumber}
              onChange={(e) => setNewUser({ ...newUser, userPhoneNumber: e.target.value })}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleAddUser}>追加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
