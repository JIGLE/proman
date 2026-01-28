"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { Sidebar } from "@/components/sidebar";
import { OverviewView } from "@/components/overview-view";
import { PropertiesView } from "@/components/properties-view";
import { LeasesView } from "@/components/leases-view";
import { PaymentMatrixView } from "@/components/payment-matrix-view";
import { OwnersView } from "@/components/owners-view";
import { TenantsView } from "@/components/tenants-view";
import { MaintenanceView } from "@/components/maintenance-view";
import { FinancialsView } from "@/components/financials-view";
import { ReceiptsView } from "@/components/receipts-view";
import { CorrespondenceView } from "@/components/correspondence-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/lib/currency-context";
import {
  User,
  LogOut,
  Mail,
  Calendar,
  Bell,
  Sun,
  Globe,
  Shield,
  Save
} from "lucide-react";
import { AppProvider } from "@/lib/app-context-db";

export default function Home(): React.ReactElement {
  const { data: session, status } = useSession();
  const { currency, setCurrency, locale, setLocale } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const t = useTranslations();
  const router = useRouter();

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') {
      // Wait for session to load
      return;
    }
    if (status === 'unauthenticated') {
      // Redirect to signin page (auth routes are outside locale prefix)
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Show loading state while session is being checked
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render page content if not authenticated (will redirect)
  if (status === 'unauthenticated' || !session) {
    return <></>;
  }

  type Settings = {
    emailNotifications: boolean;
    pushNotifications: boolean;
    maintenanceReminders: boolean;
    paymentReminders: boolean;
    theme: 'light' | 'dark' | 'system';
    profileVisibility: 'public' | 'private';
    dataSharing: boolean;
    timezone: string;
  };

  const [settings, setSettings] = useState<Settings>({
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    maintenanceReminders: true,
    paymentReminders: true,

    // Appearance
    theme: 'dark',

    // Privacy
    profileVisibility: 'private',
    dataSharing: false,

    // Account
    timezone: 'UTC',
  });

  const handleSettingChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Here you would typically save to a database or API
    console.debug('Saving settings:', settings);
    // For now, just show a success message
    alert('Settings saved successfully!');
  };

  const renderProfileContent = () => {
    const user = session?.user;
    if (!user) return null;
    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

    return (
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="text-zinc-400">Manage your account settings and preferences</p>
        </div>

        {/* Profile Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
                <AvatarFallback className="bg-blue-600 text-white text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold text-white">{user?.name}</h2>
                <p className="text-zinc-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Account Status</label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                    Active
                  </Badge>
                  <span className="text-sm text-zinc-500">Google Account</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Member Since</label>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Calendar className="w-4 h-4" />
                  <span>December 2025</span>
                </div>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <User className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">1</p>
                  <p className="text-sm text-zinc-400">Properties</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <User className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-zinc-400">Tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <User className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-zinc-400">Settings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderSettingsContent = () => {
    return (
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400">Customize your experience and preferences</p>
        </div>

        {/* Notifications */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about important updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-zinc-500">Receive updates via email</p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-zinc-500">Receive browser notifications</p>
              </div>
              <Switch
                id="push-notifications"
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-reminders">Maintenance Reminders</Label>
                <p className="text-sm text-zinc-500">Get reminded about property maintenance</p>
              </div>
              <Switch
                id="maintenance-reminders"
                checked={settings.maintenanceReminders}
                onCheckedChange={(checked) => handleSettingChange('maintenanceReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="payment-reminders">Payment Reminders</Label>
                <p className="text-sm text-zinc-500">Reminders for rent and bill payments</p>
              </div>
              <Switch
                id="payment-reminders"
                checked={settings.paymentReminders}
                onCheckedChange={(checked) => handleSettingChange('paymentReminders', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={settings.theme} onValueChange={(value) => handleSettingChange('theme', value as Settings['theme'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">{t('settings.language')}</Label>
              <Select value={currentLocale} onValueChange={(value) => router.push(`/${value}`)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="nl">Nederlands</SelectItem>
                  <SelectItem value="sv">Svenska</SelectItem>
                  <SelectItem value="da">Dansk</SelectItem>
                  <SelectItem value="no">Norsk</SelectItem>
                  <SelectItem value="fi">Suomi</SelectItem>
                  <SelectItem value="pl">Polski</SelectItem>
                  <SelectItem value="cs">Čeština</SelectItem>
                  <SelectItem value="hu">Magyar</SelectItem>
                  <SelectItem value="sk">Slovenčina</SelectItem>
                  <SelectItem value="sl">Slovenščina</SelectItem>
                  <SelectItem value="hr">Hrvatski</SelectItem>
                  <SelectItem value="sr">Srpski</SelectItem>
                  <SelectItem value="bs">Bosanski</SelectItem>
                  <SelectItem value="mk">Македонски</SelectItem>
                  <SelectItem value="sq">Shqip</SelectItem>
                  <SelectItem value="el">Ελληνικά</SelectItem>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="ro">Română</SelectItem>
                  <SelectItem value="bg">Български</SelectItem>
                  <SelectItem value="uk">Українська</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Preferences
            </CardTitle>
            <CardDescription>
              Set your regional and account preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Rome">Rome (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Madrid">Madrid (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Amsterdam">Amsterdam (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Brussels">Brussels (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Vienna">Vienna (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Prague">Prague (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Budapest">Budapest (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Warsaw">Warsaw (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Stockholm">Stockholm (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Copenhagen">Copenhagen (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Oslo">Oslo (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Helsinki">Helsinki (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Athens">Athens (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Istanbul">Istanbul (TRT)</SelectItem>
                    <SelectItem value="Europe/Bucharest">Bucharest (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Sofia">Sofia (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Kiev">Kyiv (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Moscow">Moscow (MSK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CHF">CHF (Fr)</SelectItem>
                    <SelectItem value="SEK">SEK (kr)</SelectItem>
                    <SelectItem value="NOK">NOK (kr)</SelectItem>
                    <SelectItem value="DKK">DKK (kr)</SelectItem>
                    <SelectItem value="PLN">PLN (zł)</SelectItem>
                    <SelectItem value="CZK">CZK (Kč)</SelectItem>
                    <SelectItem value="HUF">HUF (Ft)</SelectItem>
                    <SelectItem value="RON">RON (lei)</SelectItem>
                    <SelectItem value="BGN">BGN (лв)</SelectItem>
                    <SelectItem value="HRK">HRK (kn)</SelectItem>
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                    <SelectItem value="RUB">RUB (₽)</SelectItem>
                    <SelectItem value="UAH">UAH (₴)</SelectItem>
                    <SelectItem value="ISK">ISK (kr)</SelectItem>
                    <SelectItem value="MKD">MKD (ден)</SelectItem>
                    <SelectItem value="RSD">RSD (дин)</SelectItem>
                    <SelectItem value="ALL">ALL (L)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultCountry">Default Country</Label>
              <Select value={settings.timezone?.includes('Madrid') ? 'Spain' : 'Portugal'} onValueChange={(value) => {
                // Update timezone based on country selection
                const defaultTimezone = value === 'Spain' ? 'Europe/Madrid' : 'Europe/Lisbon';
                handleSettingChange('timezone', defaultTimezone);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select default country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Portugal">Portugal</SelectItem>
                  <SelectItem value="Spain">Spain</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                This affects tax calculations and address formatting defaults
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Control your privacy settings and data sharing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-visibility">Profile Visibility</Label>
              <Select value={settings.profileVisibility} onValueChange={(value) => handleSettingChange('profileVisibility', value as Settings['profileVisibility'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="data-sharing">Data Sharing</Label>
                <p className="text-sm text-zinc-500">Allow anonymous usage data collection</p>
              </div>
              <Switch
                id="data-sharing"
                checked={settings.dataSharing}
                onCheckedChange={(checked) => handleSettingChange('dataSharing', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </div>
    );
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewView />;
      case "properties":
        return <PropertiesView />;
      case "leases":
        return <LeasesView />;
      case "payments":
        return <PaymentMatrixView />;
      case "owners":
        return <OwnersView />;
      case "tenants":
        return <TenantsView />;
      case "maintenance":
        return <MaintenanceView />;
      case "financials":
        return <FinancialsView />;
      case "receipts":
        return <ReceiptsView />;
      case "correspondence":
        return <CorrespondenceView />;
      case "profile":
        return renderProfileContent();
      case "settings":
        return renderSettingsContent();
      default:
        return <OverviewView />;
    }
  };

  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-950">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 md:p-8 lg:p-10">
            {renderContent()}
          </div>
        </main>
      </div>
    </AppProvider>
  );
}

