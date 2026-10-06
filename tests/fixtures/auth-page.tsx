import {createRoot} from "react-dom/client";
import {AuthForm} from "../../src/components/auth-form";
import {AuthProvider} from "../../src/components/auth-provider";
import {emitUser, resolveGoogle, rejectGoogle} from "./auth-sdk";
createRoot(document.getElementById("root")!).render(<><AuthProvider><AuthForm mode="login"/></AuthProvider><aside aria-label="Test SDK controls"><button onClick={resolveGoogle}>Resolve Google</button><button onClick={emitUser}>Emit Firebase user</button>{["configuration-not-found", "unauthorized-domain", "popup-blocked", "popup-closed-by-user"].map(code => <button key={code} onClick={() => rejectGoogle("auth/" + code)}>{code}</button>)}</aside></>);
