import axios from 'axios';
import type {
  ExtractResponse,
  GetProjectsResponse,
  GetProjectResponse,
  HealthResponse,
} from '../../../shared/types/index.js';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function extractPen(url: string): Promise<ExtractResponse> {
  const { data } = await api.post<ExtractResponse>('/extract', { url });
  return data;
}

export async function getProjects(): Promise<GetProjectsResponse> {
  const { data } = await api.get<GetProjectsResponse>('/projects');
  return data;
}

export async function getProject(id: string): Promise<GetProjectResponse> {
  const { data } = await api.get<GetProjectResponse>(`/projects/${id}`);
  return data;
}

export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health');
  return data;
}
