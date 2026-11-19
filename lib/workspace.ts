import { z } from 'zod';
import { requestSchema } from './scheduler';
const scheduledSchema=z.object({taskId:z.string().max(100),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),start:z.string().regex(/^\d{2}:\d{2}$/),end:z.string().regex(/^\d{2}:\d{2}$/)});
const planSchema=z.object({id:z.string().max(100),createdAt:z.string().max(50),mode:z.enum(['daily','weekly']),scheduled:z.array(scheduledSchema).max(200),unscheduled:z.array(z.object({taskId:z.string().max(100),reason:z.string().max(500)})).max(200),explanation:z.string().max(2000),source:z.string().max(200)});
export const workspaceSchema=z.object({tasks:requestSchema.shape.tasks,prefs:requestSchema.shape.prefs,plans:z.array(planSchema).max(100),current:planSchema.nullable(),sound:z.boolean().default(false)});
