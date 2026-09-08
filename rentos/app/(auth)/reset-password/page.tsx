"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const initialState: ActionResult = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Choose a new password</CardTitle>
        <CardDescription>Enter and confirm your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
            {state.fieldErrors?.password && <p className="text-xs text-red-600">{state.fieldErrors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
            {state.fieldErrors?.confirmPassword && <p className="text-xs text-red-600">{state.fieldErrors.confirmPassword}</p>}
          </div>
          {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>}
          <Button type="submit" className="w-full" loading={pending}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
