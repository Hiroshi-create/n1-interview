import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/context/components/ui/dialog";
import { Button } from "@/context/components/ui/button";
import { Input } from "@/context/components/ui/input";
import { Label } from "@/context/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/context/components/ui/select";
import { positions } from '@/context/components/lists';

interface SubscriptionPlanChangeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    newPlan: {
      planType: string;
      billingCycle: string;
      startDate: string;
    };
    setNewPlan: React.Dispatch<React.SetStateAction<{
      planType: string;
      billingCycle: string;
      startDate: string;
    }>>;
    handleChangePlan: () => void;
}

const SubscriptionPlanChangeDialog: React.FC<SubscriptionPlanChangeDialogProps> = ({ isOpen, onClose, newPlan, setNewPlan, handleChangePlan }) => {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="backdrop-blur-md bg-opacity-50 bg-white dark:bg-opacity-50 dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle>サブスクリプションプランの変更</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPlan" className="text-right">新しいプラン</Label>
              <Select
                value={newPlan.planType}
                onValueChange={(value) => setNewPlan({ ...newPlan, planType: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="プランを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">ベーシック</SelectItem>
                  <SelectItem value="pro">プロ</SelectItem>
                  <SelectItem value="enterprise">エンタープライズ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="billingCycle" className="text-right">請求サイクル</Label>
              <Select
                value={newPlan.billingCycle}
                onValueChange={(value) => setNewPlan({ ...newPlan, billingCycle: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="請求サイクルを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月次</SelectItem>
                  <SelectItem value="yearly">年次</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">開始日</Label>
              <Input
                id="startDate"
                type="date"
                value={newPlan.startDate}
                onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleChangePlan}>プラン変更を確定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};

export default SubscriptionPlanChangeDialog;
