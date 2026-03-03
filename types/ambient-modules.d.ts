/**
 * Ambient module declarations for packages that don't ship proper TypeScript types
 * under moduleResolution: "bundler".
 *
 * next-auth v4 ships types for the root module but not for sub-paths like
 * next-auth/react and next-auth/next. framer-motion and next-intl have types but
 * the bundler resolution mode doesn't always pick them up from "exports".
 */

declare module "next-auth/react" {
  import type { Session } from "next-auth";
  import type { ReactNode } from "react";

  interface SessionProviderProps {
    children: ReactNode;
    session?: Session | null;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
    refetchWhenOffline?: false;
  }

  export function SessionProvider(props: SessionProviderProps): JSX.Element;
  export function useSession(): {
    data: Session | null;
    status: "loading" | "authenticated" | "unauthenticated";
    update: (data?: unknown) => Promise<Session | null>;
  };
  export function signIn(
    provider?: string,
    options?: Record<string, unknown>,
    authorizationParams?: Record<string, string>,
  ): Promise<unknown>;
  export function signOut(options?: {
    callbackUrl?: string;
    redirect?: boolean;
  }): Promise<void>;
  export function getCsrfToken(): Promise<string>;
  export function getProviders(): Promise<Record<string, unknown> | null>;
}

declare module "next-auth/next" {
  import type { NextAuthOptions, Session } from "next-auth";

  export function getServerSession(
    ...args: [NextAuthOptions] | [unknown, unknown, NextAuthOptions]
  ): Promise<Session | null>;
  export default function NextAuth(options: NextAuthOptions): unknown;
}

declare module "framer-motion" {
  import type {
    ComponentType,
    HTMLAttributes,
    SVGAttributes,
    ReactNode,
  } from "react";

  type MotionProps = HTMLAttributes<HTMLElement> & {
    initial?: Record<string, unknown> | string | boolean;
    animate?: Record<string, unknown> | string;
    exit?: Record<string, unknown> | string;
    transition?: Record<string, unknown>;
    variants?: Record<string, unknown>;
    whileHover?: Record<string, unknown>;
    whileTap?: Record<string, unknown>;
    whileInView?: Record<string, unknown>;
    viewport?: Record<string, unknown>;
    layout?: boolean | string;
    layoutId?: string;
    drag?: boolean | "x" | "y";
    dragConstraints?: Record<string, unknown>;
    style?: React.CSSProperties;
    className?: string;
    key?: string | number;
    children?: ReactNode;
    [key: string]: unknown;
  };

  type MotionComponent = ComponentType<MotionProps>;

  export const motion: {
    div: MotionComponent;
    span: MotionComponent;
    p: MotionComponent;
    button: MotionComponent;
    a: MotionComponent;
    ul: MotionComponent;
    li: MotionComponent;
    img: MotionComponent;
    section: MotionComponent;
    header: MotionComponent;
    footer: MotionComponent;
    nav: MotionComponent;
    main: MotionComponent;
    article: MotionComponent;
    aside: MotionComponent;
    form: MotionComponent;
    input: MotionComponent;
    label: MotionComponent;
    h1: MotionComponent;
    h2: MotionComponent;
    h3: MotionComponent;
    h4: MotionComponent;
    path: ComponentType<SVGAttributes<SVGPathElement> & MotionProps>;
    svg: ComponentType<SVGAttributes<SVGSVGElement> & MotionProps>;
    circle: ComponentType<SVGAttributes<SVGCircleElement> & MotionProps>;
    [key: string]: MotionComponent;
  };

  export function AnimatePresence(props: {
    children?: ReactNode;
    mode?: "sync" | "wait" | "popLayout";
    initial?: boolean;
    onExitComplete?: () => void;
    custom?: unknown;
  }): JSX.Element;

  export function useMotionValue(initial: number): {
    get: () => number;
    set: (v: number) => void;
  };
  export function useTransform(
    value: unknown,
    input: number[],
    output: number[],
  ): unknown;
  export function useSpring(
    value: unknown,
    config?: Record<string, unknown>,
  ): unknown;
  export function useAnimation(): unknown;
  export function useInView(
    ref: unknown,
    options?: Record<string, unknown>,
  ): boolean;
}

declare module "next-intl" {
  export function useTranslations(
    namespace?: string,
  ): (key: string, values?: Record<string, unknown>) => string;
  export function useLocale(): string;
  export function useMessages(): Record<string, unknown>;
  export function useNow(): Date;
  export function useTimeZone(): string;
  export function hasLocale(
    locales: readonly string[],
    locale: string,
  ): boolean;
  export function useFormatter(): {
    number: (value: number, options?: Intl.NumberFormatOptions) => string;
    dateTime: (
      value: Date | number,
      options?: Intl.DateTimeFormatOptions,
    ) => string;
    relativeTime: (value: Date | number, now?: Date | number) => string;
    list: (value: Iterable<string>, options?: Intl.ListFormatOptions) => string;
  };
  export function NextIntlClientProvider(props: {
    children: React.ReactNode;
    locale?: string;
    messages?: Record<string, unknown>;
    now?: Date;
    timeZone?: string;
  }): JSX.Element;
}

declare module "next-intl/server" {
  export function getTranslations(
    namespace?: string,
  ): Promise<(key: string, values?: Record<string, unknown>) => string>;
  export function getLocale(): Promise<string>;
  export function getMessages(): Promise<Record<string, unknown>>;
  export function getNow(): Promise<Date>;
  export function getTimeZone(): Promise<string>;
  export function setRequestLocale(locale: string): void;
  export function getRequestConfig(
    callback: (params: {
      requestLocale: Promise<string | undefined>;
    }) => Promise<{ locale: string | undefined; messages: unknown }>,
  ): unknown;
  export function getFormatter(): Promise<{
    number: (value: number, options?: Intl.NumberFormatOptions) => string;
    dateTime: (
      value: Date | number,
      options?: Intl.DateTimeFormatOptions,
    ) => string;
    relativeTime: (value: Date | number, now?: Date | number) => string;
    list: (value: Iterable<string>, options?: Intl.ListFormatOptions) => string;
  }>;
}

declare module "next-intl/navigation" {
  export function createNavigation(config: {
    locales: readonly string[];
    defaultLocale?: string;
    localePrefix?: string | { mode: string; prefixes?: Record<string, string> };
  }): {
    Link: React.ComponentType<Record<string, unknown>>;
    redirect: (path: string, options?: Record<string, unknown>) => never;
    usePathname: () => string;
    useRouter: () => Record<string, unknown>;
    getPathname: (options: Record<string, unknown>) => string;
  };
}

declare module "next-intl/plugin" {
  function createNextIntlPlugin(
    requestConfigPath?: string,
  ): (config: unknown) => unknown;
  export default createNextIntlPlugin;
}

declare module "jspdf" {
  class jsPDF {
    constructor(options?: Record<string, unknown>);
    text(
      text: string | string[],
      x: number,
      y: number,
      options?: Record<string, unknown>,
    ): jsPDF;
    setFontSize(size: number): jsPDF;
    setFont(fontName: string, fontStyle?: string): jsPDF;
    addPage(format?: string, orientation?: string): jsPDF;
    save(filename: string): jsPDF;
    output(type: string): string | ArrayBuffer;
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
    line(x1: number, y1: number, x2: number, y2: number): jsPDF;
    setDrawColor(r: number, g?: number, b?: number): jsPDF;
    setLineWidth(width: number): jsPDF;
    setTextColor(r: number, g?: number, b?: number): jsPDF;
    splitTextToSize(text: string, maxWidth: number): string[];
  }
  export default jsPDF;
}

declare module "stripe" {
  namespace Stripe {
    interface Event {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
      [key: string]: unknown;
    }
    interface PaymentIntent {
      id: string;
      amount: number;
      currency: string;
      status: string;
      metadata: Record<string, string>;
      client_secret?: string;
      next_action?: {
        type?: string;
        multibanco_display_details?: {
          entity?: string;
          reference?: string;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      last_payment_error?: {
        code?: string;
        message?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }
    interface Charge {
      id: string;
      amount: number;
      currency: string;
      status: string;
      [key: string]: unknown;
    }
    interface Refund {
      id: string;
      amount: number;
      status: string;
      [key: string]: unknown;
    }
    interface Customer {
      id: string;
      email: string | null;
      [key: string]: unknown;
    }
    interface PaymentMethod {
      id: string;
      type: string;
      [key: string]: unknown;
    }
    namespace webhooks {
      function constructEvent(
        body: string | Buffer,
        sig: string,
        secret: string,
      ): Event;
    }
    interface PaymentIntentCreateParams {
      amount: number;
      currency: string;
      metadata?: Record<string, string>;
      [key: string]: unknown;
    }
    interface Response {
      headers: Record<string, string>;
      requestId: string;
      statusCode: number;
    }
  }

  class Stripe {
    constructor(apiKey: string, config?: Record<string, unknown>);
    paymentIntents: {
      create(
        params: Stripe.PaymentIntentCreateParams,
      ): Promise<Stripe.PaymentIntent>;
      retrieve(id: string): Promise<Stripe.PaymentIntent>;
      [key: string]: unknown;
    };
    customers: {
      create(params: Record<string, unknown>): Promise<Stripe.Customer>;
      retrieve(id: string): Promise<Stripe.Customer>;
      [key: string]: unknown;
    };
    refunds: {
      create(params: Record<string, unknown>): Promise<Stripe.Refund>;
      [key: string]: unknown;
    };
    setupIntents: {
      create(
        params: Record<string, unknown>,
      ): Promise<{
        id: string;
        client_secret?: string;
        [key: string]: unknown;
      }>;
      retrieve(id: string): Promise<{ id: string; [key: string]: unknown }>;
      [key: string]: unknown;
    };
    webhooks: typeof Stripe.webhooks;
    [key: string]: unknown;
  }

  export default Stripe;
}
