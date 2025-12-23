-- Add foreign key from orders.customer_id to profiles.user_id
ALTER TABLE public.orders
ADD CONSTRAINT orders_customer_id_profiles_fkey
FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;