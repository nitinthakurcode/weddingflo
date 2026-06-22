CREATE INDEX "messages_client_id_idx" ON "messages" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "messages_receiver_read_idx" ON "messages" USING btree ("receiver_id","is_read");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_client_status_idx" ON "payments" USING btree ("client_id","status");