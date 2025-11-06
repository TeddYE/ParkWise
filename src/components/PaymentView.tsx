import { useState } from 'react';
import { ArrowLeft, CreditCard, Shield, Lock, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { ViewType, User } from '../types';
import { AuthService } from '../services/authService';

interface PaymentViewProps {
  onViewChange: (view: ViewType) => void;
  onPaymentSuccess: (user: User) => void;
  user: User | null;
  planType: 'monthly' | 'annual';
}

export function PaymentView({ onViewChange, onPaymentSuccess, user, planType }: PaymentViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingAddress: {
      line1: '',
      city: '',
      postalCode: '',
      country: 'SG',
    }
  });

  const monthlyPrice = 1.99; // GST included
  const annualPrice = 19.99; // GST included
  const currentPrice = planType === 'annual' ? annualPrice : monthlyPrice;
  const annualSavings = (monthlyPrice * 12) - annualPrice;

  // Calculate GST component (for display purposes only)
  const gstRate = 0.09; // 9% GST
  const priceBeforeGst = currentPrice / (1 + gstRate);
  const gstAmount = currentPrice - priceBeforeGst;
  const totalPrice = currentPrice; // Price already includes GST

  const handleInputChange = (field: string, value: string) => {
    setError(''); // Clear error when user types

    if (field.startsWith('billing.')) {
      const billingField = field.replace('billing.', '');
      setPaymentMethod(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [billingField]: value
        }
      }));
    } else {
      setPaymentMethod(prev => ({ ...prev, [field]: value }));
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const validatePaymentForm = () => {
    if (!paymentMethod.cardNumber.replace(/\s/g, '') || paymentMethod.cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Please enter a valid 16-digit card number');
      return false;
    }

    if (!paymentMethod.expiryDate || paymentMethod.expiryDate.length !== 5) {
      setError('Please enter a valid expiry date (MM/YY)');
      return false;
    }

    if (!paymentMethod.cvv || paymentMethod.cvv.length !== 3) {
      setError('Please enter a valid 3-digit CVV');
      return false;
    }

    if (!paymentMethod.nameOnCard.trim()) {
      setError('Please enter the name on card');
      return false;
    }

    if (!paymentMethod.billingAddress.line1.trim()) {
      setError('Please enter billing address');
      return false;
    }

    if (!paymentMethod.billingAddress.city.trim()) {
      setError('Please enter city');
      return false;
    }

    if (!paymentMethod.billingAddress.postalCode.trim()) {
      setError('Please enter postal code');
      return false;
    }

    return true;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!validatePaymentForm()) {
      return;
    }

    setLoading(true);

    // Calculate subscription expiry date
    const expiryDate = new Date();
    if (planType === 'annual') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // Call AuthService to subscribe user
    const response = await AuthService.subscribeUser(user, planType);

    if (response.error || !response.user) {
      setError(response.error || 'Payment failed. Please try again.');
      setLoading(false);
      return;
    }

    // Notify parent component of successful payment
    onPaymentSuccess(response.user);
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4">Please sign in to continue with payment</p>
            <Button onClick={() => onViewChange('login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Button variant="outline" size="icon" onClick={() => onViewChange('pricing')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl">Complete Your Purchase</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePayment} className="space-y-6">
                  {/* Card Details */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        value={paymentMethod.cardNumber}
                        onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          value={paymentMethod.expiryDate}
                          onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={paymentMethod.cvv}
                          onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 3))}
                          placeholder="123"
                          maxLength={3}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nameOnCard">Name on Card</Label>
                      <Input
                        id="nameOnCard"
                        value={paymentMethod.nameOnCard}
                        onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Billing Address</h3>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={paymentMethod.billingAddress.line1}
                        onChange={(e) => handleInputChange('billing.line1', e.target.value)}
                        placeholder="123 Marina Bay Street"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={paymentMethod.billingAddress.city}
                          onChange={(e) => handleInputChange('billing.city', e.target.value)}
                          placeholder="Singapore"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          value={paymentMethod.billingAddress.postalCode}
                          onChange={(e) => handleInputChange('billing.postalCode', e.target.value)}
                          placeholder="018956"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={paymentMethod.billingAddress.country}
                        onValueChange={(value) => handleInputChange('billing.country', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SG">Singapore</SelectItem>
                          <SelectItem value="MY">Malaysia</SelectItem>
                          <SelectItem value="TH">Thailand</SelectItem>
                          <SelectItem value="ID">Indonesia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? 'Processing Payment...' : `Pay S$${totalPrice.toFixed(2)}`}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Your payment information is secure and encrypted</span>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">ParkWise Premium</h4>
                    <p className="text-sm text-muted-foreground">
                      {planType === 'annual' ? 'Annual' : 'Monthly'} subscription
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">S${currentPrice.toFixed(2)}</div>
                    {planType === 'annual' && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Save S${annualSavings.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-medium">
                  <span>Total (GST included)</span>
                  <span>S${totalPrice.toFixed(2)}</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Includes GST of S${gstAmount.toFixed(2)}
                </div>

                {planType === 'annual' && (
                  <div className="text-sm text-muted-foreground">
                    Effective monthly rate: S${(totalPrice / 12).toFixed(2)} (GST included)
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {[
                    '24-hour availability forecasts',
                    'Smart parking insights',
                    'Advanced filtering options',
                    'Ad-free experience',
                    'Priority customer support',
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Secured by 256-bit SSL encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
