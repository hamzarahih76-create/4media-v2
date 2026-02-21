-- Allow designers to delete their own design deliveries
CREATE POLICY "Designers can delete their own deliveries"
ON design_deliveries FOR DELETE
USING (auth.uid() = designer_id);