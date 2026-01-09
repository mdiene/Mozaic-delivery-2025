
-- Enable RLS on the deliveries table
alter table deliveries enable row level security;

-- Create a policy that allows users to view their own deliveries
create policy "Users can view their own deliveries"
on deliveries for select
using ( auth.uid() = driver_id );

-- Create a policy that allows admins and managers to view all deliveries
create policy "Admins and managers can view all deliveries"
on deliveries for select
using (
  (select role from user_roles where user_id = auth.uid()) in ('ADMIN', 'MANAGER')
);
