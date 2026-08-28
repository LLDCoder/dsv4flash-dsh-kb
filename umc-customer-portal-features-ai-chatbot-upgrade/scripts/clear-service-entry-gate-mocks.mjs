const baseUrl = process.env.SERVICE_ENTRY_GATE_MOCK_BASE_URL || "http://localhost:5174";
const serviceId = process.argv[2];

async function main() {
  const target = serviceId
    ? `${baseUrl}/__dev/service-entry-gate/mock?serviceId=${encodeURIComponent(serviceId)}`
    : `${baseUrl}/__dev/service-entry-gate/mock`;

  const response = await fetch(target, {
    method: "DELETE",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to clear mocks: ${response.status} ${text}`);
  }

  const result = await response.json();
  console.log(
    `cleared serviceId=${result.serviceId || "*"} all=${serviceId ? "false" : "true"}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
