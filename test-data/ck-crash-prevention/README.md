# Mock CK Crash Logs for Testing

## Description
This directory contains mock Creation Kit crash log files for testing the CK Crash Prevention Engine's analysis capabilities.

## Files

### 1. `mock-memory-overflow.log`
Tests detection of memory overflow crashes (out of memory, heap corruption)

### 2. `mock-access-violation.log`
Tests detection of access violation crashes (null pointer, invalid memory)

### 3. `mock-access-violation-navmesh.log`
Tests detection of navmesh-specific access violations

### 4. `mock-stack-overflow.log`
Tests detection of stack overflow crashes (infinite recursion)

### 5. `mock-precombine-mismatch.log`
Tests detection of precombine/previs errors

### 6. `mock-unknown-crash.log`
Tests handling of unknown crash types

## Usage

1. Navigate to CK Crash Prevention in Mossy
2. Go to "Post-Crash Analysis" tab
3. Click "Browse" and select one of these mock logs
4. Verify diagnosis matches expected crash type

## Expected Results

| Log File | Expected Crash Type | Expected Severity | Preventable |
|----------|-------------------|------------------|-------------|
| mock-memory-overflow.log | memory_overflow | critical | Yes |
| mock-access-violation.log | access_violation | high | Partial |
| mock-access-violation-navmesh.log | navmesh_conflict | high | Yes |
| mock-stack-overflow.log | stack_overflow | critical | Yes |
| mock-precombine-mismatch.log | precombine_mismatch | medium | Yes |
| mock-unknown-crash.log | unknown | medium | No |

## Real Crash Logs

To test with real data, collect CK crash logs from:
- `Documents\My Games\Fallout4\F4SE\Logs\crash-*.log`
- Windows Event Viewer → Application logs
- `CreationKit.exe.dmp` dump files (analyze with WinDbg)
