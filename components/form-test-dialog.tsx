"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedInput, EnhancedTextarea } from '@/components/ui/enhanced-input';
import { FormField, FormGrid, FormActions } from '@/components/ui/form-components';

export function FormTestDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    message: '',
    website: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (value.length < 2) error = 'Name must be at least 2 characters';
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email';
        break;
      case 'message':
        if (value.length < 10) error = 'Message must be at least 10 characters';
        break;
      case 'website':
        if (value && !/^https?:\/\/.+$/.test(value)) error = 'Please enter a valid URL';
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const isValid = Object.entries(formData).every(([field, value]) => 
      field === 'website' || validateField(field, value)
    );
    
    if (isValid && validateField('website', formData.website)) {
      console.log('Form submitted:', formData);
      alert('Form submitted successfully!');
      setIsOpen(false);
      setFormData({ name: '', email: '', message: '', website: '' });
      setErrors({});
    }
    
    setIsSubmitting(false);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTimeout(() => validateField(field, value), 300);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="mb-4">
        Test Enhanced Forms
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enhanced Form Demo</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormGrid columns={2} gap="md">
              <FormField
                label="Full Name"
                required
                error={errors.name}
                tooltip="Enter your full legal name"
              >
                <EnhancedInput
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="John Doe"
                  variant="default"
                  size="md"
                  required
                />
              </FormField>
              
              <FormField
                label="Email Address"
                required
                error={errors.email}
                tooltip="We'll use this to contact you"
              >
                <EnhancedInput
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="john@example.com"
                  variant="default"
                  size="md"
                  required
                />
              </FormField>
            </FormGrid>
            
            <FormField
              label="Website (Optional)"
              error={errors.website}
              hint="Enter your personal or business website"
            >
              <EnhancedInput
                type="url"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://example.com"
                variant="default"
                size="md"
              />
            </FormField>
            
            <FormField
              label="Message"
              required
              error={errors.message}
              tooltip="Tell us about your inquiry"
            >
              <EnhancedTextarea
                value={formData.message}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="Enter your message here..."
                rows={4}
                maxLength={1000}
                showCharCount
                autoResize
                required
              />
            </FormField>
            
            <FormActions align="right" sticky>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit'
                )}
              </Button>
            </FormActions>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}