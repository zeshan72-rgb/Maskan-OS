"use client";

import { use, useActionState } from "react";
import { acceptInvitationAction, type ActionResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const initialState: ActionResult = {};

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const boundAction = acceptInvitationAction.bind(null, token);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accept your invitation</CardTitle>
        <CardDescription>Set your name and password to activate your RentOS account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required />
            {state.fieldErrors?.fullName && <p className="text-xs text-red-600">{state.fieldErrors.fullName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
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
            Activate account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
