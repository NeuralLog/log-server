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

export default router;
