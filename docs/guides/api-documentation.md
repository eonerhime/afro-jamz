// ==========================================
// COMPLETE SWAGGER DOCUMENTATION
// Copy these JSDoc comments and place them ABOVE each corresponding route
// ==========================================

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (local authentication)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: producer@afrojamz.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *               display_name:
 *                 type: string
 *                 example: John Producer
 *               role:
 *                 type: string
 *                 enum: [buyer, producer]
 *                 example: producer
 *               accept_indemnity:
 *                 type: boolean
 *                 description: Required for producers only
 *                 example: true
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *       400:
 *         description: Invalid input or missing fields
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
app.post('/api/auth/register', async (req, res) => {

/**
 * @swagger
 * /api/auth/oauth/{provider}:
 *   get:
 *     summary: Initiate OAuth authentication flow
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github]
 *         description: OAuth provider
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [buyer, producer]
 *         description: User role for registration
 *     responses:
 *       302:
 *         description: Redirect to OAuth provider
 *       400:
 *         description: Invalid role
 */
app.get('/api/auth/oauth/:provider', (req, res) => {

/**
 * @swagger
 * /api/auth/oauth/{provider}/callback:
 *   get:
 *     summary: OAuth callback handler
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth provider
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from provider
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter containing role
 *     responses:
 *       302:
 *         description: Redirect to success or indemnity page
 *       500:
 *         description: OAuth processing error
 */
app.get('/api/auth/oauth/:provider/callback', async (req, res) => {

/**
 * @swagger
 * /api/auth/oauth/indemnity:
 *   post:
 *     summary: Accept producer indemnity agreement (OAuth)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - provider
 *               - providerId
 *               - accept_indemnity
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               provider:
 *                 type: string
 *               providerId:
 *                 type: string
 *               accept_indemnity:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Indemnity accepted, user created
 *       403:
 *         description: Indemnity not accepted
 */
app.post('/api/auth/oauth/indemnity', (req, res) => {

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: producer@afrojamz.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     role:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Must use OAuth provider
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/auth/login', (req, res) => {

// ==========================================
// PUBLIC BEATS ROUTES
// ==========================================

/**
 * @swagger
 * /api/beats:
 *   get:
 *     summary: Get all available beats (public)
 *     tags: [Beats]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search beats by title
 *         example: afro
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre
 *         example: Afrobeat
 *       - in: query
 *         name: tempo
 *         schema:
 *           type: integer
 *         description: Filter by tempo (BPM)
 *         example: 120
 *       - in: query
 *         name: producer
 *         schema:
 *           type: string
 *         description: Filter by producer name
 *         example: DJ Awesome
 *     responses:
 *       200:
 *         description: List of enabled beats with licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   genre:
 *                     type: string
 *                   tempo:
 *                     type: integer
 *                   bpm:
 *                     type: integer
 *                   key:
 *                     type: string
 *                   duration:
 *                     type: integer
 *                   preview_url:
 *                     type: string
 *                   cover_art_url:
 *                     type: string
 *                   tags:
 *                     type: string
 *                   producer_name:
 *                     type: string
 *                   licenses:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         license_id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         price:
 *                           type: number
 *       500:
 *         description: Database error
 */
app.get('/api/beats', (req, res) => {

/**
 * @swagger
 * /api/beats/{id}:
 *   get:
 *     summary: Get single beat details (public)
 *     tags: [Beats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: Beat details with licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 genre:
 *                   type: string
 *                 tempo:
 *                   type: integer
 *                 bpm:
 *                   type: integer
 *                 key:
 *                   type: string
 *                 duration:
 *                   type: integer
 *                 preview_url:
 *                   type: string
 *                 cover_art_url:
 *                   type: string
 *                 tags:
 *                   type: string
 *                 producer_name:
 *                   type: string
 *                 licenses:
 *                   type: array
 *       404:
 *         description: Beat not found
 *       500:
 *         description: Database error
 */
app.get('/api/beats/:id', (req, res) => {

/**
 * @swagger
 * /api/beats/{beatId}/licenses:
 *   get:
 *     summary: Get licenses for a specific beat
 *     tags: [Beats]
 *     parameters:
 *       - in: path
 *         name: beatId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: List of licenses for the beat
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   license_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   usage_rights:
 *                     type: string
 *                   price:
 *                     type: number
 *       400:
 *         description: Invalid beat ID
 *       500:
 *         description: Database error
 */
app.get('/api/beats/:beatId/licenses', (req, res) => {

// ==========================================
// BUYER ROUTES
// ==========================================

/**
 * @swagger
 * /api/buyer/purchase:
 *   post:
 *     summary: Purchase a beat with a specific license
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - beat_id
 *               - license_id
 *             properties:
 *               beat_id:
 *                 type: integer
 *                 example: 1
 *               license_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Purchase successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 purchase_id:
 *                   type: integer
 *                 beat_id:
 *                   type: integer
 *                 license:
 *                   type: object
 *                 hold_until_date:
 *                   type: string
 *       400:
 *         description: Invalid request or beat not available
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Buyer access only
 *       500:
 *         description: Purchase failed
 */
app.post('/api/buyer/purchase', authenticateToken, requireBuyer, (req, res) => {

/**
 * @swagger
 * /api/buyer/purchases:
 *   get:
 *     summary: Get all purchases for logged-in buyer
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of buyer's purchases
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   purchase_id:
 *                     type: integer
 *                   paid_price:
 *                     type: number
 *                   commission:
 *                     type: number
 *                   seller_earnings:
 *                     type: number
 *                   payout_status:
 *                     type: string
 *                   purchased_at:
 *                     type: string
 *                   refund_status:
 *                     type: string
 *                   beat_id:
 *                     type: integer
 *                   beat_title:
 *                     type: string
 *                   genre:
 *                     type: string
 *                   license_name:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Buyer access only
 *       500:
 *         description: Database error
 */
app.get('/api/buyer/purchases', authenticateToken, requireBuyer, (req, res) => {

/**
 * @swagger
 * /api/buyer/beats/{id}/download:
 *   get:
 *     summary: Download purchased beat (full version)
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: File download initiated
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Access denied - purchase required
 *       404:
 *         description: Beat or file not found
 *       500:
 *         description: Server error
 */
app.get('/api/buyer/beats/:id/download', authenticateToken, (req, res) => {

/**
 * @swagger
 * /api/buyer/beats/{id}/secure-url:
 *   get:
 *     summary: Generate secure download URL with temporary token
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: Secure download URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloadUrl:
 *                   type: string
 *                   example: /api/beats/1/download?token=xyz123
 *                 expiresIn:
 *                   type: string
 *                   example: 5 minutes
 *       403:
 *         description: Purchase required
 *       500:
 *         description: Server error
 */
app.get('/api/buyer/beats/:id/secure-url', authenticateToken, (req, res) => {

/**
 * @swagger
 * /api/buyer/purchases/{id}/dispute:
 *   post:
 *     summary: Lodge a dispute for a purchase
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Purchase ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Downloaded file is corrupted
 *     responses:
 *       200:
 *         description: Dispute lodged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 purchase_id:
 *                   type: integer
 *                 flag_reason:
 *                   type: string
 *       400:
 *         description: Already disputed or cannot dispute
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Buyer access only
 *       404:
 *         description: Purchase not found
 */
app.post('/api/buyer/purchases/:id/dispute', authenticateToken, requireBuyer, (req, res) => {

// ==========================================
// PRODUCER ROUTES
// ==========================================

/**
 * @swagger
 * /api/producer/beats/upload:
 *   post:
 *     summary: Upload a new beat
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - licenses
 *             properties:
 *               title:
 *                 type: string
 *                 example: Afro Groove
 *               genre:
 *                 type: string
 *                 example: Afrobeat
 *               tempo:
 *                 type: integer
 *                 example: 120
 *               key:
 *                 type: string
 *                 example: Am
 *               bpm:
 *                 type: integer
 *                 example: 120
 *               duration:
 *                 type: integer
 *                 example: 180
 *               previewUrl:
 *                 type: string
 *                 example: preview.mp3
 *               fullUrl:
 *                 type: string
 *                 example: full.mp3
 *               cover_art_url:
 *                 type: string
 *                 example: cover.jpg
 *               tags:
 *                 type: string
 *                 example: afrobeat,dance,uptempo
 *               licenses:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     license_id:
 *                       type: integer
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Beat uploaded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Upload failed
 */
app.post('/api/producer/beats/upload', authenticateToken, requireProducer, (req, res) => {

/**
 * @swagger
 * /api/producer/beats/{id}:
 *   put:
 *     summary: Update an existing beat
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               genre:
 *                 type: string
 *               tempo:
 *                 type: integer
 *               key:
 *                 type: string
 *               bpm:
 *                 type: integer
 *               duration:
 *                 type: integer
 *               previewUrl:
 *                 type: string
 *               fullUrl:
 *                 type: string
 *               cover_art_url:
 *                 type: string
 *               tags:
 *                 type: string
 *               licenses:
 *                 type: array
 *                 description: Can only update if beat has no purchases
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Beat updated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not your beat or has purchases (licenses)
 *       404:
 *         description: Beat not found
 *       500:
 *         description: Update failed
 */
app.put('/api/producer/beats/:id', authenticateToken, requireProducer, (req, res) => {

/**
 * @swagger
 * /api/producer/beats:
 *   get:
 *     summary: Get all beats for logged-in producer
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of producer's beats with licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 beats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       genre:
 *                         type: string
 *                       is_active:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       licenses:
 *                         type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Database error
 */
app.get('/api/producer/beats', authenticateToken, requireProducer, (req, res) => {

/**
 * @swagger
 * /api/producer/dashboard:
 *   get:
 *     summary: Get producer financial dashboard
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard financial data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sales:
 *                   type: integer
 *                   description: Total number of sales
 *                 gross_revenue:
 *                   type: number
 *                   description: Total revenue before commission
 *                 total_commission:
 *                   type: number
 *                   description: Platform commission taken
 *                 total_earnings:
 *                   type: number
 *                   description: Total producer earnings
 *                 paid_out:
 *                   type: number
 *                   description: Amount already withdrawn
 *                 available_for_withdrawal:
 *                   type: number
 *                   description: Amount available to withdraw now
 *                 total_on_hold:
 *                   type: number
 *                   description: Amount locked (disputes/time-hold)
 *                 on_hold:
 *                   type: array
 *                   description: Details of held purchases
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Database error
 */
app.get('/api/producer/dashboard', authenticateToken, requireProducer, (req, res) => {

/**
 * @swagger
 * /api/producer/sales:
 *   get:
 *     summary: Get detailed sales history
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   purchase_id:
 *                     type: integer
 *                   beat_id:
 *                     type: integer
 *                   beat_title:
 *                     type: string
 *                   buyer_email:
 *                     type: string
 *                   license_name:
 *                     type: string
 *                   paid_price:
 *                     type: number
 *                   commission:
 *                     type: number
 *                   seller_earnings:
 *                     type: number
 *                   payout_status:
 *                     type: string
 *                   refund_status:
 *                     type: string
 *                   purchased_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Database error
 */
app.get('/api/producer/sales', authenticateToken, requireProducer, (req, res) => {

/**
 * @swagger
 * /api/producer/sales/summary:
 *   get:
 *     summary: Get sales summary statistics
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sales:
 *                   type: integer
 *                 gross_revenue:
 *                   type: number
 *                 total_commission:
 *                   type: number
 *                 total_earnings:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Database error
 */
app.get('/api/producer/sales/summary', authenticateToken, requireProducer, (req, res) => {

/**
 * @swagger
 * /api/producer/withdrawals:
 *   post:
 *     summary: Request withdrawal of available funds
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 500.00
 *                 description: Amount to withdraw (must not exceed available funds)
 *     responses:
 *       200:
 *         description: Withdrawal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 withdrawal:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     purchases_linked:
 *                       type: integer
 *                     available_before:
 *                       type: number
 *                     available_after:
 *                       type: number
 *       400:
 *         description: Insufficient funds or invalid amount
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Withdrawal failed
 */
app.post('/api/producer/withdrawals', authenticateToken, requireProducer, (req, res) => {

/**
 * @swagger
 * /api/producer/beats/{id}/status:
 *   put:
 *     summary: Enable or disable a beat (producer self-moderation)
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled]
 *                 example: disabled
 *     responses:
 *       200:
 *         description: Beat status updated
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Not your beat
 *       404:
 *         description: Beat not found
 *       500:
 *         description: Update failed
 */
app.put('/api/producer/beats/:id/status', authenticateToken, requireProducer, (req, res) => {

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @swagger
 * /api/admin/licenses:
 *   post:
 *     summary: Create a new global license template
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Exclusive Plus
 *               description:
 *                 type: string
 *                 example: Premium exclusive rights with distribution
 *               usage_rights:
 *                 type: string
 *                 example: Full ownership, unlimited distribution
 *     responses:
 *       201:
 *         description: License created
 *       400:
 *         description: License name must be unique
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Creation failed
 */
app.post('/api/admin/licenses', authenticateToken, requireAdmin, (req, res) => {

/**
 * @swagger
 * /api/admin/licenses/{id}:
 *   put:
 *     summary: Update a license template (if not used by any beat)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: License ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               usage_rights:
 *                 type: string
 *     responses:
 *       200:
 *         description: License updated
 *       400:
 *         description: Cannot update - already used by beats
 *       404:
 *         description: License not found
 *       500:
 *         description: Update failed
 */
app.put('/api/admin/licenses/:id', authenticateToken, requireAdmin, (req, res) => {

/**
 * @swagger
 * /api/admin/licenses:
 *   get:
 *     summary: Get all license templates
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   usage_rights:
 *                     type: string
 *                   created_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
app.get('/api/admin/licenses', authenticateToken, requireAdmin, (req, res) => {

/**
 * @swagger
 * /api/admin/beats:
 *   get:
 *     summary: Get all beats (including disabled/problematic)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all beats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   producer_id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   genre:
 *                     type: string
 *                   is_active:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
app.get('/api/admin/beats', authenticateToken, requireAdmin, (req, res) => {

/**
 * @swagger
 * /api/admin/beats/{id}/status:
 *   put:
 *     summary: Moderate beat status (enable, disable, ban)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled, under_review, banned]
 *                 example: banned
 *     responses:
 *       200:
 *         description: Beat status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Beat not found
 *       500:
 *         description: Update failed
 */
app.put('/api/admin/beats/:id/status', authenticateToken, requireAdmin, (req, res) => {

/**
 * @swagger
 * /api/admin/disputes/{purchaseId}/resolve:
 *   put:
 *     summary: Resolve a purchase dispute
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Purchase ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [reject, approve, resolve]
 *                 description: |
 *                   **reject**: Dismiss buyer complaint (invalid) - release funds
 *                   
 *                   **approve**: Valid complaint - producer must fix - keep funds locked
 *                   
 *                   **resolve**: Producer fixed issue - release funds
 *                 example: approve
 *               note:
 *                 type: string
 *                 example: File was corrupted, producer must re-upload
 *     responses:
 *       200:
 *         description: Dispute resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 purchase_id:
 *                   type: integer
 *                 action:
 *                   type: string
 *                 amount_released:
 *                   type: number
 *       400:
 *         description: Invalid action or purchase not disputed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Purchase not found
 */
app.put('/api/admin/disputes/:purchaseId/resolve', authenticateToken, requireAdmin, (req, res) => {

/**
 * @swagger
 * /api/admin/sales:
 *   get:
 *     summary: Get all platform sales
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all purchases
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
app.get('/api/admin/sales', authenticateToken, requireAdmin, (req, res) => {

/**
 * @swagger
 * /api/admin/sales/summary:
 *   get:
 *     summary: Get platform-wide sales summary
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform sales summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sales:
 *                   type: integer
 *                 gross_revenue:
 *                   type: number
 *                 total_commission:
 *                   type: number
 *                 total_producer_earnings:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
app.get('/api/admin/sales/summary', authenticateToken, requireAdmin, (req, res) => {

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get comprehensive platform analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sales:
 *                   type: integer
 *                   description: Total number of sales
 *                 gross_revenue:
 *                   type: number
 *                   description: Total revenue
 *                 total_commission:
 *                   type: number
 *                   description: Platform commission earned
 *                 total_paid_to_producers:
 *                   type: number
 *                   description: Total producer earnings
 *                 paid_out:
 *                   type: number
 *                   description: Amount actually withdrawn
 *                 pending_payouts:
 *                   type: number
 *                   description: Unpaid earnings (available + held)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
app.get('/api/admin/analytics', authenticateToken, requireAdmin, (req, res) => {

// ==========================================
// USAGE INSTRUCTIONS
// ==========================================

/*
TO IMPLEMENT:

1. Copy each JSDoc comment block
2. Paste it DIRECTLY ABOVE the corresponding route in server.js
3. Make sure there's NO empty line between the comment and the route
4. The route signature must match exactly

Example:
```javascript
[Copy the entire JSDoc comment here]
app.post('/api/auth/register', async (req, res) => {
  // your existing code
});
```

DO NOT:
- Add extra lines between comment and route
- Modify the route path in the comment
- Change parameter names

After adding all comments:
1. Restart your server
2. Visit http://localhost:3001/api-docs
3. You'll see beautiful interactive documentation!

Tags used for grouping:
- Authentication: Auth routes
- Beats: Public beat browsing
- Buyer: Buyer-specific routes
- Producer: Producer-specific routes
- Admin: Admin-only routes
*/