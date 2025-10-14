'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { vendorSchema, type VendorFormData } from '@/lib/validations/vendor.schema';

interface Vendor {
  _id: Id<'vendors'>;
  name: string;
  category: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  status: 'prospect' | 'contacted' | 'quoted' | 'booked' | 'confirmed' | 'completed' | 'cancelled';
  contractDate?: string;
  serviceDate?: string;
  totalCost: number;
  depositAmount?: number;
  depositPaidDate?: string;
  rating?: number;
  wouldRecommend?: boolean;
  notes?: string;
}

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor;
  weddingId: Id<'weddings'>;
}

export function VendorDialog({
  open,
  onOpenChange,
  vendor,
  weddingId,
}: VendorDialogProps) {
  const { toast } = useToast();
  const createVendor = useMutation(api.vendors.createVendor);
  const updateVendor = useMutation(api.vendors.updateVendor);

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      category: 'other',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      status: 'prospect',
      contractDate: '',
      serviceDate: '',
      totalCost: 0,
      depositAmount: 0,
      depositPaidDate: '',
      balance: 0,
      payments: [],
      rating: undefined,
      wouldRecommend: false,
      notes: '',
      tags: [],
    },
  });

  // Update form when vendor changes
  useEffect(() => {
    if (vendor) {
      form.reset({
        name: vendor.name,
        category: vendor.category as any,
        contactName: vendor.contactName || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        website: vendor.website || '',
        address: vendor.address || '',
        status: vendor.status,
        contractDate: vendor.contractDate || '',
        serviceDate: vendor.serviceDate || '',
        totalCost: vendor.totalCost,
        depositAmount: vendor.depositAmount || 0,
        depositPaidDate: vendor.depositPaidDate || '',
        rating: vendor.rating,
        wouldRecommend: vendor.wouldRecommend || false,
        notes: vendor.notes || '',
      });
    } else {
      form.reset({
        name: '',
        category: 'other',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        status: 'prospect',
        contractDate: '',
        serviceDate: '',
        totalCost: 0,
        depositAmount: 0,
        depositPaidDate: '',
        rating: undefined,
        wouldRecommend: false,
        notes: '',
      });
    }
  }, [vendor, form]);

  const onSubmit = async (data: VendorFormData) => {
    try {
      // Convert to numbers and ensure they're valid
      const totalCost = Number(data.totalCost) || 0;
      const depositAmount = Number(data.depositAmount) || 0;

      console.log('=== VENDOR FORM SUBMISSION ===');
      console.log('Total Cost:', totalCost);
      console.log('Deposit Amount:', depositAmount);
      console.log('Expected Balance:', totalCost - depositAmount);

      if (vendor) {
        // Update existing vendor
        await updateVendor({
          vendorId: vendor._id,
          name: data.name,
          category: data.category,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
          status: data.status,
          contractDate: data.contractDate,
          serviceDate: data.serviceDate,
          totalCost: totalCost,
          depositAmount: depositAmount,
          depositPaidDate: data.depositPaidDate,
          rating: data.rating,
          wouldRecommend: data.wouldRecommend,
          notes: data.notes,
        });
        toast({
          title: 'Success',
          description: `Vendor updated! Balance should be $${totalCost - depositAmount}`,
        });
      } else {
        // Create new vendor
        await createVendor({
          weddingId,
          name: data.name,
          category: data.category,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
          status: data.status,
          contractDate: data.contractDate,
          serviceDate: data.serviceDate,
          totalCost: totalCost,
          depositAmount: depositAmount,
          depositPaidDate: data.depositPaidDate,
          rating: data.rating,
          wouldRecommend: data.wouldRecommend,
          notes: data.notes,
        });
        toast({
          title: 'Success',
          description: 'Vendor added successfully',
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: vendor ? 'Failed to update vendor' : 'Failed to add vendor',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
          <DialogDescription>
            {vendor
              ? 'Update the vendor details below.'
              : 'Enter the vendor details below. Fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="The Grand Ballroom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="venue">Venue</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="photography">Photography</SelectItem>
                        <SelectItem value="videography">Videography</SelectItem>
                        <SelectItem value="florist">Florist</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="decor">Decor</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="stationery">Stationery</SelectItem>
                        <SelectItem value="hair_makeup">Hair & Makeup</SelectItem>
                        <SelectItem value="attire">Attire</SelectItem>
                        <SelectItem value="cake">Cake</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@vendor.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://vendor.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State 12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="quoted">Quoted</SelectItem>
                        <SelectItem value="booked">Booked</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Cost *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? 0 : parseFloat(value));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contractDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? undefined : parseFloat(value));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="depositPaidDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Paid Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1-5 stars)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Star</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wouldRecommend"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Would Recommend
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the vendor..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving...'
                  : vendor
                  ? 'Update Vendor'
                  : 'Add Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
