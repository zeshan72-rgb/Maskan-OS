"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type ActionResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const initialState: ActionResult & { submitted?: boolean } = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await forgotPasswordAction(prev, fd);
    return { ...result, submitted: !result.error && !result.fieldErrors };
  }, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reset your password</CardTitle>
        <CardDescription>We&apos;ll email you a link to choose a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.submitted ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@company.qa" required />
              {state.fieldErrors?.email && <p className="text-xs text-red-600">{state.fieldErrors.email}</p>}
            </div>
            <Button type="submit" className="w-full" loading={pending}>
              Send reset link
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-neutral-500">
          <Link href="/sign-in" className="hover:text-neutral-900">Back to sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
