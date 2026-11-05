import re
import subprocess
from datetime import datetime, timezone


def measure_latency(
    target: str,
    count: int = 5,
    timeout: int = 2,
):
    """
    Measure network latency using ICMP ping.

    Returns:
        Target, latency statistics, packet loss,
        individual samples and timestamp.
    """

    # Validate input
    target = target.strip()

    if not target or len(target) > 253:
        raise ValueError("Invalid target")

    if any(char.isspace() for char in target) or target.startswith("-"):
        raise ValueError("Invalid target")

    if not 1 <= count <= 20:
        raise ValueError("Count must be between 1 and 20")

    if not 1 <= timeout <= 10:
        raise ValueError("Timeout must be between 1 and 10 seconds")

    # Execute ping
    command = [
        "ping",
        "-n",
        "-c", str(count),
        "-W", str(timeout),
        "--",
        target,
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=count * timeout + 5,
            env={"LC_ALL": "C"},
        )

        output = result.stdout + result.stderr

    except subprocess.TimeoutExpired:
        return {
            "target": target,
            "status": "timeout",
            "error": "Ping process timed out",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except FileNotFoundError:
        raise RuntimeError("The ping utility is not installed")

    # Extract packet statistics
    packet_match = re.search(
        r"(\d+)\s+packets transmitted,\s+(\d+)\s+received",
        output,
    )

    if not packet_match:
        return {
            "target": target,
            "status": "error",
            "error": output.strip() or "Unable to execute ping",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    transmitted = int(packet_match.group(1))
    received = int(packet_match.group(2))

    packet_loss = round(
        ((transmitted - received) / transmitted) * 100,
        2,
    )

    # Extract individual latency samples
    samples = [
        float(value)
        for value in re.findall(r"time[=<]([\d.]+)\s*ms", output)
    ]

    # Extract latency statistics
    stats_match = re.search(
        r"(?:rtt|round-trip) min/avg/max/(?:mdev|stddev)\s*=\s*"
        r"([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)",
        output,
    )

    if stats_match:
        minimum = float(stats_match.group(1))
        average = float(stats_match.group(2))
        maximum = float(stats_match.group(3))
        jitter = float(stats_match.group(4))
    else:
        minimum = average = maximum = jitter = None

    # Determine measurement status
    if received == 0:
        status = "timeout"
    elif packet_loss > 0:
        status = "partial"
    else:
        status = "success"

    return {
        "target": target,
        "status": status,
        "packets_transmitted": transmitted,
        "packets_received": received,
        "packet_loss_percent": packet_loss,
        "latency_min_ms": minimum,
        "latency_avg_ms": average,
        "latency_max_ms": maximum,
        "jitter_ms": jitter,
        "samples_ms": samples,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }