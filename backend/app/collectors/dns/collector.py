import time
from datetime import datetime, timezone

import dns.flags
import dns.resolver


DNS_RESOLVERS = {
    "cloudflare": "1.1.1.1",
    "google": "8.8.8.8",
    "quad9": "9.9.9.9",
}

SUPPORTED_RECORD_TYPES = [
    "A",
    "AAAA",
    "MX",
    "NS",
    "TXT",
    "CAA",
    "SOA",
]


def measure_dns(domain: str, record_type: str, resolver_name: str):
    if resolver_name not in DNS_RESOLVERS:
        raise ValueError("Unsupported DNS resolver")

    if record_type not in SUPPORTED_RECORD_TYPES:
        raise ValueError("Unsupported DNS record type")

    resolver = dns.resolver.Resolver(configure=False)

    resolver.nameservers = [DNS_RESOLVERS[resolver_name]]
    resolver.timeout = 3
    resolver.lifetime = 5

    start_time = time.perf_counter()

    try:
        answer = resolver.resolve(
            domain,
            record_type,
            search=False,
            lifetime=5,
            raise_on_no_answer=False,
            want_dnssec=True,
        )

        duration = (time.perf_counter() - start_time) * 1000

        response = answer.response

        answers = []

        if answer.rrset:
            answers = [record.to_text() for record in answer]

        return {
            "domain": domain,
            "record_type": record_type,
            "resolver": resolver_name,
            "resolver_ip": DNS_RESOLVERS[resolver_name],
            "answers": answers,
            "response_time_ms": round(duration, 2),
            "status": "success" if answers else "no_answer",
            "dnssec_ad_flag": bool(response.flags & dns.flags.AD),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except dns.resolver.NXDOMAIN:
        status = "nxdomain"
        message = "Domain does not exist"

    except dns.resolver.NoAnswer:
        status = "no_answer"
        message = "No records found"

    except dns.resolver.LifetimeTimeout:
        status = "timeout"
        message = "DNS query timed out"

    except dns.resolver.NoNameservers:
        status = "no_nameservers"
        message = "No nameservers available"

    except Exception as error:
        status = "error"
        message = str(error)

    duration = (time.perf_counter() - start_time) * 1000

    return {
        "domain": domain,
        "record_type": record_type,
        "resolver": resolver_name,
        "resolver_ip": DNS_RESOLVERS[resolver_name],
        "answers": [],
        "response_time_ms": round(duration, 2),
        "status": status,
        "error": message,
        "dnssec_ad_flag": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }