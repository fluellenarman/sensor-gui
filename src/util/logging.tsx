
function colorPrint(color: string, ...message: any[]) {
    let c: string;
    let msg: string = message.join(' ');
    switch (color) {
        case 'red':
            c = '\x1b[31m';
            break;
        case 'green':
            c = '\x1b[32m';
            break;
        case 'yellow':
            c = '\x1b[33m';
            break;
        case 'blue':
            c = '\x1b[34m';
            break;
        case 'magenta':
            c = '\x1b[35m';
            break;
        case 'cyan':
            c = '\x1b[36m';
            break;
        default:
            c = '\x1b[0m';
            break;
    }
    console.log(c, msg, `\x1b[0m`);
}

export {colorPrint};