import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(var(--primary)/0.1),transparent_50%)]" />
      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg mb-4">
            <span className="text-4xl font-bold text-primary-foreground">A</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            ARAA TRADE LUBES
          </h1>
          <p className="text-xl font-medium text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Business Management Platform
          </p>
        </div>

        <Card className="border-2 border-primary/20 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Sign in to manage your business operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 p-5 border border-primary/20">
              <p className="text-sm text-foreground/80 leading-relaxed">
                Manage customers, vendors, products, and invoices all in one place. Track payments and communicate
                seamlessly with WhatsApp integration.
              </p>
            </div>
            <Button 
              onClick={login} 
              disabled={isLoggingIn} 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity shadow-lg" 
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In with Internet Identity
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Secure authentication powered by Internet Computer
        </p>
      </div>
    </div>
  );
}

