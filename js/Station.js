'use strict';

const e = React.createElement;

const actionMap = {
    'authorize': 'Authorize',
    'boot': 'BootNotification',
    'start': 'StartTransaction',
    'stop': 'StopTransaction',
    'unlock': 'UnlockConnector',
    'data transfer': 'DataTransfer',
    'diagnostics': 'DiagnosticsStatusNotification',
    'firmware': 'FirmwareStatusNotification',
    'heartbeat': 'Heartbeat',
    'meter': 'MeterValues',
    'status': 'StatusNotification',
};

function composeMessage(action, stationId=0) {
    const idTag = USERS[stationId].idTag;  // global var
    let message;
    switch (action) {
        case 'Authorize':
            message = [action, { idTag }];
            break;
        case 'StartTransaction':
            message = [action, { connectorId: 1, idTag }];
            break;
        case 'StopTransaction':
            // need client to handle transactionId
            message = [action, { connectorId: 1, idTag, reason: 'Local' }];
            break;
        case 'DataTransfer':
        case 'DiagnosticsStatusNotification':
        case 'FirmwareStatusNotification':
        case 'Heartbeat':
        case 'MeterValues':
        case 'StatusNotification':
        default:
            message = [action];
    }

    return message;
}

window.Station = ({ stationProps, stationId }) => {
    const [socket, setSocket] = React.useState();
    const [online, setOnline] = React.useState();
    const [authorized, setAuthorized] = React.useState(false);  
    const [message, setMessage] = React.useState();
    const [logs, setLogs] = React.useState([]);
    const [charging, setCharging] = React.useState(false);
    const [limit, setLimit] = React.useState(undefined);

    const handleClick = (event) => {
        console.log(event.target.value);
        const value = event.target.value.toLowerCase();
        const action = actionMap[value];
        const message = composeMessage(action, stationId);

        send(message);
    }

    const send = (message) => {
        console.log('sending message', message);
        socket.send(JSON.stringify(message));
    };

    React.useEffect(() => {
        const ws = new WebSocket('ws://localhost:5050/simulator' + stationId);
        setSocket(ws);

        ws.onopen = () => {
            console.log('Connection open');
            setOnline(true);
        };
        ws.onmessage = (message) => {
            let data = JSON.parse(message.data)
            console.log('From client server', data);
            setMessage(data);

            let [messageType, payload] = data;

            switch (messageType) {
                case 'OCPP':
                    setLogs(payload);
                    break;
                case 'AuthorizeConf':
                    setAuthorized(payload);
                    break;
                case 'StartTransactionConf':
                    setCharging(payload);
                    break;
                case 'StopTransactionConf':
                    setCharging(!payload);
                    if (payload) {
                        setAuthorized(false);
                    }
                    break;
                case 'SetChargingProfileConf':
                    setLimit(payload);
                    break;
            }
        };
        ws.onclose = () => {
            console.log('Connection closed');
            setOnline(false);
        };

        return () => { ws.close() };
    }, []);

    const maxPower = stationProps.ratings.amp * stationProps.ratings.voltage / 1000;

    const status = {
        header: stationProps.name,
        status: `Status: ${online ? 'online' : 'offline'}`,
        charging,
        power: (((limit === undefined || limit === null) ? maxPower : Number(limit))) * Number(charging)
    };

    return (
        <div>
            {e(
                window.Card,
                status,
                e(window.Button, { label: 'Boot', onClick: handleClick }),
                e(window.Button, { label: 'Authorize', onClick: handleClick }),
                e(window.Button, { label: 'Start', onClick: handleClick, disabled: !authorized }),
                e(window.Button, { label: 'Stop', onClick: handleClick, disabled: !authorized }),
                e(window.Button, { label: 'Data Transfer', onClick: handleClick }),
                e(window.Button, { label: 'Diagnostics', onClick: handleClick }),
                e(window.Button, { label: 'Firmware', onClick: handleClick }),
                e(window.Button, { label: 'Heartbeat', onClick: handleClick }),
                e(window.Button, { label: 'Meter', onClick: handleClick }),
                e(window.Button, { label: 'Status', onClick: handleClick }),
            )}
            <div style={{ height: "12px" }} />
            {e(
                window.Logs,
                { logs: logs.map(log => 
                        `${log[0]}------${log[1]}------${JSON.stringify(log[2])}`
                    )
                }
            )}
        </div>
    );
}
