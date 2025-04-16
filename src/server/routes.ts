import express from 'express';
import {
  overwriteLog,
  appendToLog,
  getLogByName,
  getLogs,
  clearLog,
  getLogEntryById,
  updateLogEntryById,
  deleteLogEntryById,
  searchLogs
} from './controllers/logsController';
import { permissionController } from '../controllers/PermissionController';
import { publicKeyController } from '../controllers/PublicKeyController';
import { kekController } from '../controllers/KEKController';
import retentionPolicyRoutes from '../routes/retentionPolicyRoutes';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Logs
 *     description: Log management
 *   - name: Log Entries
 *     description: Log entry management
 */

// Logs endpoints

/**
 * @swagger
 * /logs/{logName}:
 *   post:
 *     summary: Overwrite a log (clear and add new entries)
 *     tags: [Logs]
 *     parameters:
 *       - $ref: '#/components/parameters/logNameParam'
 *       - $ref: '#/components/parameters/namespaceParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Log overwritten successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 logId:
 *                   type: string
 *                   example: 123e4567-e89b-12d3-a456-426614174000
 *                 namespace:
 *                   type: string
 *                   example: default
 *       500:
 *         description: Server error
 */
router.post('/logs/:logName', overwriteLog);

/**
 * @swagger
 * /logs/{logName}:
 *   patch:
 *     summary: Append to a log
 *     tags: [Logs]
 *     parameters:
 *       - $ref: '#/components/parameters/logNameParam'
 *       - $ref: '#/components/parameters/namespaceParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Log entry appended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 logId:
 *                   type: string
 *                   example: 123e4567-e89b-12d3-a456-426614174000
 *                 namespace:
 *                   type: string
 *                   example: default
 *       500:
 *         description: Server error
 */
router.patch('/logs/:logName', appendToLog);

/**
 * @swagger
 * /logs/{logName}:
 *   get:
 *     summary: Get a log by name
 *     tags: [Logs]
 *     parameters:
 *       - $ref: '#/components/parameters/logNameParam'
 *       - $ref: '#/components/parameters/namespaceParam'
 *       - $ref: '#/components/parameters/limitParam'
 *     responses:
 *       200:
 *         description: Log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogResponse'
 *       500:
 *         description: Server error
 */
router.get('/logs/:logName', getLogByName);

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Get all logs
 *     tags: [Logs]
 *     parameters:
 *       - $ref: '#/components/parameters/namespaceParam'
 *       - $ref: '#/components/parameters/limitParam'
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogsResponse'
 *       500:
 *         description: Server error
 */
router.get('/logs', getLogs);

/**
 * @swagger
 * /logs/{logName}:
 *   delete:
 *     summary: Clear a log
 *     tags: [Logs]
 *     parameters:
 *       - $ref: '#/components/parameters/logNameParam'
 *       - $ref: '#/components/parameters/namespaceParam'
 *     responses:
 *       200:
 *         description: Log cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 namespace:
 *                   type: string
 *                   example: default
 *       500:
 *         description: Server error
 */
router.delete('/logs/:logName', clearLog);

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search logs
 *     tags: [Logs]
 *     parameters:
 *       - $ref: '#/components/parameters/namespaceParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - name: query
 *         in: query
 *         schema:
 *           type: string
 *         description: Search query
 *       - name: log_name
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by log name
 *       - name: start_time
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start time for filtering
 *       - name: end_time
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End time for filtering
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 namespace:
 *                   type: string
 *                   example: default
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LogEntry'
 *       500:
 *         description: Server error
 */
router.get('/search', searchLogs);


// Log entry endpoints

/**
 * @swagger
 * /logs/{logName}/{logId}:
 *   get:
 *     summary: Get a log entry by ID
 *     tags: [Log Entries]
 *     parameters:
 *       - $ref: '#/components/parameters/logNameParam'
 *       - $ref: '#/components/parameters/logIdParam'
 *       - $ref: '#/components/parameters/namespaceParam'
 *     responses:
 *       200:
 *         description: Log entry retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 namespace:
 *                   type: string
 *                   example: default
 *                 entry:
 *                   $ref: '#/components/schemas/LogEntry'
 *       404:
 *         description: Log entry not found
 *       500:
 *         description: Server error
 */
router.get('/logs/:logName/:logId', getLogEntryById);

/**
 * @swagger
 * /logs/{logName}/{logId}:
 *   post:
 *     summary: Update a log entry by ID
 *     tags: [Log Entries]
 *     parameters:
 *       - $ref: '#/components/parameters/logNameParam'
 *       - $ref: '#/components/parameters/logIdParam'
 *       - $ref: '#/components/parameters/namespaceParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Log entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 namespace:
 *                   type: string
 *                   example: default
 *       404:
 *         description: Log entry not found
 *       500:
 *         description: Server error
 */
router.post('/logs/:logName/:logId', updateLogEntryById);

/**
 * @swagger
 * /logs/{logName}/{logId}:
 *   delete:
 *     summary: Delete a log entry by ID
 *     tags: [Log Entries]
 *     parameters:
 *       - $ref: '#/components/parameters/logNameParam'
 *       - $ref: '#/components/parameters/logIdParam'
 *       - $ref: '#/components/parameters/namespaceParam'
 *     responses:
 *       200:
 *         description: Log entry deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 namespace:
 *                   type: string
 *                   example: default
 *       404:
 *         description: Log entry not found
 *       500:
 *         description: Server error
 */
router.delete('/logs/:logName/:logId', deleteLogEntryById);

/**
 * @swagger
 * /permissions/check:
 *   post:
 *     summary: Check if a user has permission to perform an action on a resource
 *     tags: [Permissions]
 *     parameters:
 *       - $ref: '#/components/parameters/namespaceParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - resource
 *             properties:
 *               action:
 *                 type: string
 *                 description: Action to check (e.g., read, write, delete)
 *                 example: read
 *               resource:
 *                 type: string
 *                 description: Resource to check permission for
 *                 example: logs/test-log
 *               contextualTuples:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: string
 *                       description: User identifier
 *                       example: user:123
 *                     relation:
 *                       type: string
 *                       description: Relation type
 *                       example: member
 *                     object:
 *                       type: string
 *                       description: Object identifier
 *                       example: group:456
 *     responses:
 *       200:
 *         description: Permission check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allowed:
 *                   type: boolean
 *                   description: Whether the permission is allowed
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Skip authentication middleware for permission check endpoint
router.post('/permissions/check', (req, res, next) => {
  // Skip authentication middleware
  req.skipAuth = true;
  next();
}, permissionController.checkPermission.bind(permissionController));

/**
 * @swagger
 * tags:
 *   - name: Public Keys
 *     description: Public key management
 */

/**
 * @swagger
 * /public-keys:
 *   post:
 *     summary: Store a public key
 *     tags: [Public Keys]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicKey
 *               - keyId
 *             properties:
 *               publicKey:
 *                 type: string
 *                 description: Public key in PEM format
 *               keyId:
 *                 type: string
 *                 description: Key ID
 *     responses:
 *       200:
 *         description: Public key stored successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/public-keys', publicKeyController.storePublicKey);

/**
 * @swagger
 * /public-keys/{userId}/{keyId}:
 *   get:
 *     summary: Get a public key
 *     tags: [Public Keys]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - name: keyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Key ID
 *     responses:
 *       200:
 *         description: Public key retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Public key not found
 *       500:
 *         description: Server error
 */
router.get('/public-keys/:userId/:keyId', publicKeyController.getPublicKey);

/**
 * @swagger
 * /public-keys/{keyId}:
 *   delete:
 *     summary: Delete a public key
 *     tags: [Public Keys]
 *     parameters:
 *       - name: keyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Key ID
 *     responses:
 *       200:
 *         description: Public key deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/public-keys/:keyId', publicKeyController.deletePublicKey);

/**
 * @swagger
 * /public-keys/{userId}:
 *   get:
 *     summary: List all public keys for a user
 *     tags: [Public Keys]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Public keys listed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/public-keys/:userId', publicKeyController.listPublicKeys);

/**
 * @swagger
 * tags:
 *   - name: KEK Versions
 *     description: KEK version management
 */

/**
 * @swagger
 * /kek-versions:
 *   post:
 *     summary: Store a new KEK version
 *     tags: [KEK Versions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - createdAt
 *               - status
 *             properties:
 *               id:
 *                 type: string
 *                 description: KEK version ID
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *                 description: Creation date
 *               status:
 *                 type: string
 *                 enum: [active, decrypt-only, inactive]
 *                 description: KEK version status
 *               reason:
 *                 type: string
 *                 description: Reason for creating the KEK version
 *     responses:
 *       200:
 *         description: KEK version stored successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/kek-versions', kekController.storeKEKVersion);

/**
 * @swagger
 * /kek-versions/{id}:
 *   get:
 *     summary: Get a KEK version
 *     tags: [KEK Versions]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: KEK version ID
 *     responses:
 *       200:
 *         description: KEK version retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: KEK version not found
 *       500:
 *         description: Server error
 */
router.get('/kek-versions/:id', kekController.getKEKVersion);

/**
 * @swagger
 * /kek-versions:
 *   get:
 *     summary: List all KEK versions
 *     tags: [KEK Versions]
 *     responses:
 *       200:
 *         description: KEK versions listed successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/kek-versions', kekController.listKEKVersions);

/**
 * @swagger
 * /kek-versions/current:
 *   get:
 *     summary: Get the current active KEK version
 *     tags: [KEK Versions]
 *     responses:
 *       200:
 *         description: Current KEK version retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active KEK version found
 *       500:
 *         description: Server error
 */
router.get('/kek-versions/current', kekController.getCurrentKEKVersion);

/**
 * @swagger
 * /kek-versions/{id}:
 *   put:
 *     summary: Update a KEK version
 *     tags: [KEK Versions]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: KEK version ID
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
 *                 enum: [active, decrypt-only, inactive]
 *                 description: KEK version status
 *     responses:
 *       200:
 *         description: KEK version updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: KEK version not found
 *       500:
 *         description: Server error
 */
router.put('/kek-versions/:id', kekController.updateKEKVersion);

// Mount retention policy routes
router.use('/', retentionPolicyRoutes);

export default router;
