--
-- PostgreSQL database dump
--

\restrict IjWrNJmzKhYxoubZVEO9VMBymjfRiEaU17nAJCFarftcKeOireXq7kQCcm6slxW

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg12+2)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: uuid_v4(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.uuid_v4() RETURNS uuid
    LANGUAGE sql
    AS $$
    SELECT (
        substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-' ||
        substr(md5(random()::text || clock_timestamp()::text), 9, 4) || '-4' ||
        substr(md5(random()::text || clock_timestamp()::text), 14, 3) || '-' ||
        substr('89ab', floor(random() * 4)::integer + 1, 1) ||
        substr(md5(random()::text || clock_timestamp()::text), 18, 3) || '-' ||
        substr(md5(random()::text || clock_timestamp()::text), 21, 12)
    )::uuid;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    currency character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    user_id uuid NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: oauth_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_accounts (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    provider_user_id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT oauth_accounts_provider_check CHECK (((provider)::text = ANY ((ARRAY['google'::character varying, 'microsoft'::character varying, 'github'::character varying])::text[])))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    currency character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    user_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    currency character varying(10) NOT NULL,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying NOT NULL,
    payment_provider character varying(50),
    payment_reference character varying(255),
    shipping_name character varying(255),
    shipping_phone character varying(50),
    shipping_line1 character varying(255),
    shipping_line2 character varying(255),
    shipping_city character varying(100),
    shipping_state character varying(100),
    shipping_postal_code character varying(20),
    shipping_country character varying(2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'paid'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'shipped'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    order_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(10) NOT NULL,
    provider character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    stripe_payment_intent_id character varying(255),
    failure_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'authorized'::character varying, 'captured'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sku character varying(100),
    price numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_stock_check CHECK ((stock >= 0))
);


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipments (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    order_id uuid NOT NULL,
    provider character varying(30) DEFAULT 'shippo'::character varying NOT NULL,
    carrier character varying(100),
    service character varying(100),
    tracking_number character varying(255),
    tracking_url text,
    label_url text,
    provider_shipment_id character varying(255),
    provider_transaction_id character varying(255),
    status character varying(20) DEFAULT 'pre_transit'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shipments_status_check CHECK (((status)::text = ANY ((ARRAY['pre_transit'::character varying, 'in_transit'::character varying, 'delivered'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    name character varying(255),
    phone character varying(50),
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(2),
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'admin'::character varying, 'vendor'::character varying])::text[])))
);


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, cart_id, product_id, quantity, unit_price, currency, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.carts (id, user_id, currency, created_at, updated_at) FROM stdin;
4b503f09-77e0-46cd-82d6-6adc5d6af636	079b8619-987b-450c-971d-e10a33218562	USD	2026-10-02 22:58:40.859945+00	2026-10-02 22:58:40.859945+00
330387a6-87c4-476a-9ae8-bdb754752343	faf92763-2210-4542-bbd2-9a33eb2c5c0c	USD	2026-10-02 23:01:02.42265+00	2026-10-02 23:01:02.42265+00
0edfb058-031b-4646-a8c2-63be0fc90711	a42172d7-68c2-4eb3-b169-fdfbfdc9aeff	USD	2026-10-02 23:07:54.741506+00	2026-10-02 23:07:54.741506+00
\.


--
-- Data for Name: oauth_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.oauth_accounts (id, user_id, provider, provider_user_id, created_at) FROM stdin;
31530fd6-4640-46a4-aabd-7c87e55817f4	a42172d7-68c2-4eb3-b169-fdfbfdc9aeff	github	277300039	2026-10-02 22:58:25.861351+00
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, quantity, unit_price, currency, created_at, updated_at) FROM stdin;
d78a61b2-2818-4579-aed0-3a2ecc35b17a	ea5668a1-e83d-426e-8d68-4c239d19021a	678a0fb2-296b-4e70-943d-c8bff8d745b6	2	349.99	USD	2026-10-02 22:59:43.871948+00	2026-10-02 22:59:43.871948+00
d47d74d5-e25a-4f3a-b826-847fcc4aedc4	7d8e0bc7-2879-4854-af92-575ca9223ef0	7758ca10-f8aa-40e5-9017-75a1f051692c	2	199.99	USD	2026-10-02 23:01:15.993672+00	2026-10-02 23:01:15.993672+00
29dabfd7-c489-40e8-8a3a-ccde55769d5e	d238f17e-e77e-48f1-b2d9-827087f8c34f	043010c4-d153-4e59-b48c-936a0ffa0ef6	1	1299.99	USD	2026-10-02 23:03:50.602216+00	2026-10-02 23:03:50.602216+00
39785678-b73f-49dd-95b0-413d447506a6	66b2772a-3390-4f43-8898-ecf0592835d8	01e54468-be4d-4dd9-b041-2ce28220661d	1	39.99	USD	2026-10-02 23:34:35.781444+00	2026-10-02 23:34:35.781444+00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, status, total_amount, currency, payment_status, payment_provider, payment_reference, shipping_name, shipping_phone, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, created_at, updated_at) FROM stdin;
ea5668a1-e83d-426e-8d68-4c239d19021a	faf92763-2210-4542-bbd2-9a33eb2c5c0c	paid	699.98	USD	paid	stripe	e741e798-bd89-443a-9090-158efecd2a7d	Some Tester	3216549876	6541 Somewhere Nice	6541 Somewhere Nice	Big Town	WA	98000	US	2026-10-02 22:59:43.871948+00	2026-10-02 23:00:03.482516+00
7d8e0bc7-2879-4854-af92-575ca9223ef0	faf92763-2210-4542-bbd2-9a33eb2c5c0c	paid	399.98	USD	paid	stripe	cbf67d6f-c8b7-4172-a20c-9ad0550d60b1	Some Tester	3216549876	6541 Somewhere Nice	6541 Somewhere Nice	Big Town	WA	98000	US	2026-10-02 23:01:15.993672+00	2026-10-02 23:01:26.341902+00
d238f17e-e77e-48f1-b2d9-827087f8c34f	faf92763-2210-4542-bbd2-9a33eb2c5c0c	shipped	1299.99	USD	paid	stripe	e0e20aed-ad85-4926-ae34-b1e963312826	Some Tester	3216549876	1600 Pennsylvania Ave NW	\N	Washington	DC	20500	US	2026-10-02 23:03:50.602216+00	2026-10-02 23:28:26.016398+00
66b2772a-3390-4f43-8898-ecf0592835d8	a42172d7-68c2-4eb3-b169-fdfbfdc9aeff	shipped	39.99	USD	paid	stripe	8dd47ac3-b8c6-4d15-ab5b-94858b30f612	Nicolas Figueroa Hidalgo	19162707964	6408 Seglass Ave SE	\N	Port Orchard	Washington	98367	US	2026-10-02 23:34:35.781444+00	2026-10-02 23:35:25.726587+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, order_id, amount, currency, provider, status, stripe_payment_intent_id, failure_message, created_at, updated_at) FROM stdin;
e741e798-bd89-443a-9090-158efecd2a7d	ea5668a1-e83d-426e-8d68-4c239d19021a	699.98	USD	stripe	captured	pi_3UMFQh7F84dBdpPk1sGGqTMb	\N	2026-10-02 22:59:51.234197+00	2026-10-02 23:00:03.479655+00
cbf67d6f-c8b7-4172-a20c-9ad0550d60b1	7d8e0bc7-2879-4854-af92-575ca9223ef0	399.98	USD	stripe	captured	pi_3UMFS47F84dBdpPk0XJ9fqBw	\N	2026-10-02 23:01:16.478909+00	2026-10-02 23:01:26.338161+00
e0e20aed-ad85-4926-ae34-b1e963312826	d238f17e-e77e-48f1-b2d9-827087f8c34f	1299.99	USD	stripe	captured	pi_3UMFUg7F84dBdpPk0D9h0JSp	\N	2026-10-02 23:03:58.454278+00	2026-10-02 23:04:17.339654+00
8dd47ac3-b8c6-4d15-ab5b-94858b30f612	66b2772a-3390-4f43-8898-ecf0592835d8	39.99	USD	stripe	captured	pi_3UMFyT7F84dBdpPk1i8R0spK	\N	2026-10-02 23:34:45.342941+00	2026-10-02 23:35:10.516013+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, description, sku, price, currency, stock, image_url, is_active, created_at, updated_at) FROM stdin;
f53dc559-f9bb-4923-90fa-72e964164055	Iphone	Latest-generation smartphone	\N	999.99	USD	30	https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=640&q=80	t	2026-10-02 22:25:13.077032+00	2026-10-02 22:25:13.077032+00
bdacc0b1-b375-4a84-8521-8be518d3faad	Keyboard	Mechanical keyboard	\N	89.99	USD	100	https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=640&q=80	t	2026-10-02 22:25:13.077032+00	2026-10-02 22:25:13.077032+00
a2e6bd32-8338-43f3-820a-a9a4660c7fe4	Webcam	1080p HD webcam	\N	59.99	USD	75	https://images.unsplash.com/photo-1760348213920-d2a90ed705fd?auto=format&fit=crop&w=640&q=80	t	2026-10-02 22:25:13.077032+00	2026-10-02 22:25:13.077032+00
678a0fb2-296b-4e70-943d-c8bff8d745b6	4K Monitor	27-inch 4K UHD monitor	\N	349.99	USD	23	https://images.unsplash.com/photo-1527443195645-1133f7f28990?auto=format&fit=crop&w=640&q=80	t	2026-10-02 22:25:13.077032+00	2026-10-02 22:59:43.871948+00
7758ca10-f8aa-40e5-9017-75a1f051692c	Headphones	Noise cancelling	\N	199.99	USD	48	https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=640&q=80	t	2026-10-02 22:25:13.077032+00	2026-10-02 23:01:15.993672+00
043010c4-d153-4e59-b48c-936a0ffa0ef6	Laptop	High performance laptop	\N	1299.99	USD	9	https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=640&q=80	t	2026-10-02 22:25:13.077032+00	2026-10-02 23:03:50.602216+00
01e54468-be4d-4dd9-b041-2ce28220661d	Wireless Mouse	Ergonomic wireless mouse	\N	39.99	USD	149	https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=640&q=80	t	2026-10-02 22:25:13.077032+00	2026-10-02 23:34:35.781444+00
\.


--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shipments (id, order_id, provider, carrier, service, tracking_number, tracking_url, label_url, provider_shipment_id, provider_transaction_id, status, created_at, updated_at) FROM stdin;
a609fae2-a4ea-401d-a381-e88589e53ad3	d238f17e-e77e-48f1-b2d9-827087f8c34f	shippo	USPS	Ground Advantage	9334620845500001738473	https://tools.usps.com/go/TrackConfirmAction_input?origTrackNum=9334620845500001738473	https://deliver.goshippo.com/fc5d6c16cb5946fbbe1c00d02db2d07c.pdf?Expires=1822519705&Signature=YQamXFiSQ8CKGUXiKsjGh~cGH1MSPqlp-kPbXiUTOJVuaNagUK7EbV7GddCCK2gkLd1am0O1hLWo3Yfk0KgN5VdxNQ~tn9rxkA-Z7jO~BlzTjbW~zKxOltdmxAZmVnPBL28vn-8RD3qfZ0kgPCnIz~A6KeEsGpOn3ifxCW0wCh-jYyb2rBruBwB0-sj-ECZOn9XARou0NDEh-9r9mz-DNqgX2JIeepnaBeIxR6zqBWSgbhfh~vRX3X2K8r7h4Kwc6eEVmXDtmph61k4PPrqtXi0LwCagn1cxDaSskcirQJrJe6FitGDztYex6KIY8LInIe1kESt7Yf2e2NzyF4yDjw__&Key-Pair-Id=APKAJRICFXQ2S4YUQRSQ	cd6f21d8a7724a01a00a9e20170de2f4	fc5d6c16cb5946fbbe1c00d02db2d07c	pre_transit	2026-10-02 23:28:26.016398+00	2026-10-02 23:28:26.016398+00
5125c732-3ab5-47e8-814a-c6f6e28d26fb	66b2772a-3390-4f43-8898-ecf0592835d8	shippo	USPS	Ground Advantage	9334620845500001738893	https://tools.usps.com/go/TrackConfirmAction_input?origTrackNum=9334620845500001738893	https://deliver.goshippo.com/ecefd97fea9941d1be454a9e80035d70.pdf?Expires=1822520125&Signature=DsouXzMZcQZDG74GHggIo-xhhDgHmKxkJ0mFl1JNHH6Hw-7sFt-PGITH5STFrr4OJiEzQsqcR4A3NDB7NkgNtzLNg97Zyb44HFTPIG6X570~Dhuy4WpQdJLzs8RM5XAWuG7IHRgKH1nUuWKn7c~wkQMhNyX1rKUxT~qRwAB7zQHo7nR9uozwj4XzY-FRTWyQy8Dky46sb7eJeS2a~GLwai47SqqV~QaD3E4tpU8TE0UfIxFeLq07ntG95hKMsD58kyDj3L2IuKAmbgo2kp2uIoO5NZJJDQc4mQuwca0g6XEtPrEPpcKeQgwtcu2~gOrzUocZJEk8ykPPrl1e-7lMzQ__&Key-Pair-Id=APKAJRICFXQ2S4YUQRSQ	a258a881c6124603a72a101f2fbe6ab2	ecefd97fea9941d1be454a9e80035d70	pre_transit	2026-10-02 23:35:25.726587+00	2026-10-02 23:35:25.726587+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, name, phone, address_line1, address_line2, city, state, postal_code, country, role, is_active, created_at, updated_at) FROM stdin;
faf92763-2210-4542-bbd2-9a33eb2c5c0c	customer@example.com	$2b$10$.7PyMvXZEx/6MHNNh6oXiuTkrpy2Nocxlj6OS3Jxn2/roAVHWalMe	\N	\N	\N	\N	\N	\N	\N	\N	customer	t	2026-10-02 22:25:13.018208+00	2026-10-02 22:25:13.018208+00
a42172d7-68c2-4eb3-b169-fdfbfdc9aeff	nico.figueroa.hidalgo@outlook.com	\N	Nicolas Figueroa Hidalgo	19162707964	6408 Seglass Ave SE		Port Orchard	Washington	98367	US	customer	t	2026-10-02 22:58:25.861351+00	2026-10-02 23:08:04.321829+00
079b8619-987b-450c-971d-e10a33218562	admin@example.com	$2b$10$Kgcnmei15FOSS5ijnnrUbOE5W7zA7AVZvTZt/YsoSDgwvt06kZilm	\N	\N	\N	\N	\N	\N	\N	\N	admin	t	2026-10-02 22:25:12.967556+00	2026-10-02 23:42:39.84261+00
\.


--
-- Name: cart_items cart_items_cart_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: carts carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);


--
-- Name: oauth_accounts oauth_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_pkey PRIMARY KEY (id);


--
-- Name: oauth_accounts oauth_accounts_provider_provider_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_provider_provider_user_id_key UNIQUE (provider, provider_user_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_payments_stripe_payment_intent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_stripe_payment_intent_id ON public.payments USING btree (stripe_payment_intent_id);


--
-- Name: idx_products_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);


--
-- Name: idx_shipments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_order_id ON public.shipments USING btree (order_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: oauth_accounts oauth_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict IjWrNJmzKhYxoubZVEO9VMBymjfRiEaU17nAJCFarftcKeOireXq7kQCcm6slxW

