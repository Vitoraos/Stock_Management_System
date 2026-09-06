"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormDescription,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  fullName: z.string().min(1, "Full name is required").max(100, "Full name is too long"),
});

export type BootstrapValues = z.infer<typeof schema>;

export function BootstrapForm({
  onSubmit,
}: {
  onSubmit: (values: BootstrapValues) => Promise<string | null>;
}) {
  const form = useForm<BootstrapValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  });

  async function handleSubmit(values: BootstrapValues) {
    const error = await onSubmit(values);
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Owner created",
      description: "You can now log in with your credentials",
      variant: "default",
    });
  }

  return (
    <Card className="w-full max-w-md space-y-6">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-semibold">
          Create Owner Account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@hotel.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>We&apos;ll never share your email with anyone else.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Hotel Manager Name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Creating..." : "Create Owner Account"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
