'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/daily-notebook-advisor.ts';
import '@/ai/flows/organize-schedule-flow.ts';
