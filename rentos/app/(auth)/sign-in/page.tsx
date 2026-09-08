"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type ActionResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const initialState: ActionResult = {};

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sign in to your account</CardTitle>
        <CardDescription>Manager, owner, tenant and vendor logins all use this page.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@company.qa" autoComplete="email" required />
            {state.fieldErrors?.email && <p className="text-xs text-red-600">{state.fieldErrors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-neutral-500 hover:text-neutral-900">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
            {state.fieldErrors?.password && <p className="text-xs text-red-600">{state.fieldErrors.password}</p>}
          </div>

          {state.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
          )}

          <Button type="submit" className="w-full" loading={pending}>
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
