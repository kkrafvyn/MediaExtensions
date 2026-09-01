import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "consumer"]);
export const fulfillmentEnum = pgEnum("fulfillment", ["digital", "physical", "both"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "awaiting_pickup",
  "paid",
  "fulfilled",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "momo",
  "bank",
  "pickup",
  "paystack",
]);
export const repairStatusEnum = pgEnum("repair_status", [
  "submitted",
  "diagnosing",
  "quoted",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
]);
export const notificationChannelEnum = pgEnum("notification_channel", [
  "whatsapp",
  "sms",
  "email",
  "log",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("consumer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  pricePesewas: integer("price_pesewas").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  fulfillment: fulfillmentEnum("fulfillment").notNull().default("physical"),
  stock: integer("stock").notNull().default(0),
  digitalAssetPath: text("digital_asset_path"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  email: text("email").notNull(),
  phone: text("phone"),
  name: text("name").notNull(),
  status: orderStatusEnum("status").notNull().default("pending_payment"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  subtotalPesewas: integer("subtotal_pesewas").notNull(),
  shippingPesewas: integer("shipping_pesewas").notNull().default(0),
  totalPesewas: integer("total_pesewas").notNull(),
  currency: text("currency").notNull().default("GHS"),
  shipping: jsonb("shipping").$type<{
    fullName: string;
    phone: string;
    street: string;
    city: string;
    region: string;
    landmark?: string;
  } | null>(),
  paymentNote: text("payment_note"),
  paystackReference: text("paystack_reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: notificationChannelEnum("channel").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  quantity: integer("quantity").notNull(),
  unitPricePesewas: integer("unit_price_pesewas").notNull(),
  fulfillment: fulfillmentEnum("fulfillment").notNull(),
  digitalAssetPath: text("digital_asset_path"),
});

// An append-only ledger for payments confirmed at the counter or from an
// external transfer. Gateway payments remain verified through their provider.
export const paymentRecords = pgTable("payment_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  amountPesewas: integer("amount_pesewas").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const downloadTokens = pgTable("download_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderItemId: uuid("order_item_id")
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  maxDownloads: integer("max_downloads").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const repairServices = pgTable("repair_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  pricePesewas: integer("price_pesewas"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const repairOrders = pgTable("repair_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  serviceId: uuid("service_id").references(() => repairServices.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  deviceBrand: text("device_brand").notNull(),
  deviceModel: text("device_model").notNull(),
  issue: text("issue").notNull(),
  dropOffNotes: text("drop_off_notes"),
  status: repairStatusEnum("status").notNull().default("submitted"),
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  quotePesewas: integer("quote_pesewas"),
  staffNotes: text("staff_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  topic: text("topic").notNull().default("general"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  repairOrders: many(repairOrders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  repairServices: many(repairServices),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  cartItems: many(cartItems),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  payments: many(paymentRecords),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  order: one(orders, { fields: [paymentRecords.orderId], references: [orders.id] }),
  recordedBy: one(users, { fields: [paymentRecords.recordedByUserId], references: [users.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  downloadTokens: many(downloadTokens),
}));

export const downloadTokensRelations = relations(downloadTokens, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [downloadTokens.orderItemId],
    references: [orderItems.id],
  }),
}));

export const repairServicesRelations = relations(repairServices, ({ one, many }) => ({
  category: one(categories, {
    fields: [repairServices.categoryId],
    references: [categories.id],
  }),
  repairOrders: many(repairOrders),
}));

export const repairOrdersRelations = relations(repairOrders, ({ one }) => ({
  user: one(users, { fields: [repairOrders.userId], references: [users.id] }),
  service: one(repairServices, {
    fields: [repairOrders.serviceId],
    references: [repairServices.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type RepairService = typeof repairServices.$inferSelect;
export type RepairOrder = typeof repairOrders.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
