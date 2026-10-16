"""Additional local OCR protection: opt out before import and fail closed on networking.

Do not use this launcher for public model downloads or Library transfers.
"""
import os, errno, ctypes, ctypes.util, runpy, sys
_locked=False

def lock_network():
    global _locked
    if _locked:return
    for key in ['ORT_DISABLE_TELEMETRY','HF_HUB_DISABLE_TELEMETRY','HF_HUB_OFFLINE','TRANSFORMERS_OFFLINE','DO_NOT_TRACK']:
        os.environ[key]='1'
    path=ctypes.util.find_library('seccomp')
    if not path:
        raise RuntimeError('No OS network lock available; refusing OCR startup')
    lib=ctypes.CDLL(path,use_errno=True)
    lib.seccomp_init.argtypes=[ctypes.c_uint32];lib.seccomp_init.restype=ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p];lib.seccomp_syscall_resolve_name.restype=ctypes.c_int
    lib.seccomp_rule_add.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint];lib.seccomp_rule_add.restype=ctypes.c_int
    lib.seccomp_load.argtypes=[ctypes.c_void_p];lib.seccomp_load.restype=ctypes.c_int
    lib.seccomp_release.argtypes=[ctypes.c_void_p]
    ctx=lib.seccomp_init(0x7fff0000)
    if not ctx:raise RuntimeError('Network lock initialization failed')
    try:
        for name in [b'socket',b'connect',b'sendto',b'sendmsg',b'sendmmsg']:
            syscall=lib.seccomp_syscall_resolve_name(name)
            if syscall<0 or lib.seccomp_rule_add(ctx,0x00050000|errno.EPERM,syscall,0)!=0:
                raise RuntimeError('Network lock configuration failed')
        if lib.seccomp_load(ctx)!=0:raise RuntimeError('Network lock installation failed')
    finally:lib.seccomp_release(ctx)
    import socket
    try:socket.socket(socket.AF_INET,socket.SOCK_STREAM)
    except OSError as e:
        if e.errno!=errno.EPERM:raise
    else:raise RuntimeError('Network lock ineffective; refusing OCR startup')
    _locked=True

if __name__=='__main__':
    lock_network()
    if len(sys.argv)<2:
        print('OS network lock verified; telemetry opt-out set before library import')
    else:
        target=sys.argv[1];sys.argv=sys.argv[1:];runpy.run_path(target,run_name='__main__')
