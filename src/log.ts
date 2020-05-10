const logContainer = document.getElementById("container:log");

export default function log(...messages: Array<string | Error>) {
    const item = document.createElement("div");
    for(const message of messages) {
        const span = document.createElement("span");
        span.innerText = message as any;
        span.innerText += " ";
        item.appendChild(span);
    }
    logContainer.append(item);
    item.scrollIntoView({
        behavior: "smooth"
    });
}

(window as any).log = log;