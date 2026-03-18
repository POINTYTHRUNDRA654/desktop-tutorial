"""
mossy_link.py
=============
Stub module that satisfies ``_try_import("mossy_link")`` in __init__.py
and the ``from . import mossy_link as _ml`` calls in operators.py.

The real Mossy AI functionality lives in an optional external Blender extension
(the "Mossy Link" server).  When that extension is not installed, this stub
keeps the add-on working by returning None from ask_mossy() so callers
degrade gracefully.
"""


def ask_mossy(query: str, context_data=None, timeout: float = 15):
    """
    Send a query to the local Mossy AI server.

    :param query: The natural-language question or prompt to send.
    :param context_data: Optional dict of extra context (e.g. mesh analysis
        results) that the server can use to give a more specific answer.
    :param timeout: Seconds to wait for a response before giving up.
    :returns: The server's plain-text response string, or ``None`` if the
        server is unavailable (not installed, not running, or timed out).

    This stub always returns None.  Install the Mossy Link Blender extension
    and start its server to get real AI responses.
    """
    return None


def register():
    pass


def unregister():
    pass
