from backend.app.collectors.network.latency import measure_latency

targets = [
    "1.1.1.1",
    "8.8.8.8",
    "9.9.9.9",
]

for target in targets:
    print(f"\nTesting {target}...")

    result = measure_latency(target)

    print(result)