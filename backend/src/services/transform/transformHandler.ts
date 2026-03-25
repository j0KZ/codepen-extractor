export const jobQueue = new Map<
  string,
  { projectId: string; conversationId: string; message: string; status: string }
>();

export function processTransformJob(
  projectId: string,
  conversationId: string,
  message: string
): void {
  jobQueue.set(conversationId, {
    projectId,
    conversationId,
    message,
    status: "processing",
  });

  setTimeout(() => {
    const job = jobQueue.get(conversationId);
    if (job) {
      job.status = "completed";
    }
  }, 5000);
}
