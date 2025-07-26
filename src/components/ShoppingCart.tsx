import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart as ShoppingCartIcon, Trash2, Plus, Minus, Bitcoin, Coins } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import CheckoutModal from './CheckoutModal';
import { PaymentMethodModal } from './PaymentMethodModal';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
  category: string;
}

interface ShoppingCartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

interface WalletBalance {
  balance_eur: number;
  balance_btc: number;
  balance_ltc: number;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ 
  open, 
  onOpenChange, 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [ltcPrice, setLtcPrice] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'btc' | 'ltc' | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBtcPrice();
      fetchLtcPrice();
      fetchWalletBalance();
    }
  }, [open, user]);

  const fetchBtcPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur');
      const data = await response.json();
      setBtcPrice(data.bitcoin.eur);
    } catch (error) {
      console.error('Error fetching BTC price:', error);
    }
  };

  const fetchLtcPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=eur');
      const data = await response.json();
      setLtcPrice(data.litecoin.eur);
    } catch (error) {
      console.error('Error fetching LTC price:', error);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallet_balances')
        .select('balance_eur, balance_btc, balance_ltc')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setWalletBalance(data || { balance_eur: 0, balance_btc: 0, balance_ltc: 0 });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const handleCheckout = async () => {
    if (!walletBalance) {
      toast({
        title: "Error",
        description: "Wallet balance could not be loaded",
        variant: "destructive",
      });
      return;
    }

    if (walletBalance.balance_eur < totalEUR) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance on your account.",
        variant: "destructive",
      });
      return;
    }

    setPaymentMethodOpen(true);
  };

  const handleConfirmOrder = async (addressData: any) => {
    if (!user || !walletBalance) return;

    setIsProcessingOrder(true);
    
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount_eur: totalEUR,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_eur: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of cartItems) {
        // First get the current stock
        const { data: productData, error: fetchError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (fetchError) throw fetchError;

        // Update the stock
        const newStock = productData.stock - item.quantity;
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: Math.max(0, newStock) })
          .eq('id', item.id);

        if (stockError) throw stockError;
      }

      // Update wallet balance
      const newBalance = walletBalance.balance_eur - totalEUR;
      const { error: balanceError } = await supabase
        .from('wallet_balances')
        .update({ balance_eur: newBalance })
        .eq('user_id', user.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount_eur: -totalEUR,
          type: 'purchase',
          description: `Order #${order.id.slice(0, 8)}`,
          status: 'confirmed'
        });

      if (transactionError) throw transactionError;

      // Success
      toast({
        title: "Order Successful",
        description: "Your order has been successfully placed",
      });

      onClearCart();
      setCheckoutOpen(false);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error processing order:', error);
      toast({
        title: "Error",
        description: "Order could not be processed",
        variant: "destructive",
      });
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleSelectPayment = (method: 'btc' | 'ltc') => {
    setSelectedPaymentMethod(method);
    setPaymentMethodOpen(false);
    setCheckoutOpen(true);
  };

  const totalEUR = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalBTC = btcPrice ? totalEUR / btcPrice : null;
  const totalLTC = ltcPrice ? totalEUR / ltcPrice : null;

  const CartContent = () => (
    <div className="space-y-4">
      {cartItems.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCartIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Ihr Warenkorb ist leer</p>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className={`space-y-3 ${isMobile ? 'max-h-80' : 'max-h-64'} overflow-y-auto`}>
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className={`${isMobile ? 'p-2' : 'p-3'}`}>
                  <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className={`object-cover rounded ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium truncate ${isMobile ? 'text-sm' : ''}`}>{item.title}</h4>
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                      <p className="text-sm font-semibold text-primary">€{item.price.toFixed(2)}</p>
                    </div>
                    
                    {isMobile ? (
                      <div className="flex flex-col items-center space-y-1">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          >
                            <Minus className="h-2 w-2" />
                          </Button>
                          
                          <span className="w-6 text-center text-xs">{item.quantity}</span>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-2 w-2" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 className="h-2 w-2" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Total */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Gesamt:</span>
              <div className="text-right">
                <div className="text-primary">€{totalEUR.toFixed(2)}</div>
                {totalBTC && (
                  <div className="text-sm text-orange-500 flex items-center justify-end">
                    <Bitcoin className="h-3 w-3 mr-1" />
                    ₿{totalBTC.toFixed(8)}
                  </div>
                )}
                {totalLTC && (
                  <div className="text-sm text-blue-500 flex items-center justify-end">
                    <Coins className="h-3 w-3 mr-1" />
                    Ł{totalLTC.toFixed(8)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-2'}`}>
            <Button 
              variant="outline" 
              onClick={onClearCart}
              className="flex-1"
            >
              Warenkorb leeren
            </Button>
            <Button className="flex-1" onClick={handleCheckout}>
              Zur Kasse
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-4">
              <DrawerTitle className="flex items-center space-x-2">
                <ShoppingCartIcon className="h-5 w-5" />
                <span>Warenkorb ({cartItems.length} Artikel)</span>
              </DrawerTitle>
            </DrawerHeader>
            
            <div className="px-4 pb-4">
              <CartContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <ShoppingCartIcon className="h-5 w-5" />
                <span>Warenkorb ({cartItems.length} Artikel)</span>
              </DialogTitle>
            </DialogHeader>
            
            <CartContent />
          </DialogContent>
        </Dialog>
      )}
      
      <PaymentMethodModal
        open={paymentMethodOpen}
        onOpenChange={setPaymentMethodOpen}
        onSelectPayment={handleSelectPayment}
        totalAmountEur={totalEUR}
        currentBtcPrice={btcPrice || 0}
        currentLtcPrice={ltcPrice || 0}
        walletBalance={walletBalance}
      />
      
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmount={totalEUR}
        onConfirmOrder={handleConfirmOrder}
        loading={isProcessingOrder}
      />
    </>
  );
};

export default ShoppingCart;