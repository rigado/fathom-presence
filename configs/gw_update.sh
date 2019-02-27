#!/bin/bash
config=edgeDirectConfig.json

if [ "$1" == "test" ]; then
    email=chris.mills+tulkas-dev@rigado.net
    gateways=(C031051823-00169)
else
    email=oliver@rigado.net
    gateways=(C032031826-00031 C0320B1830-00156 C032031826-00030 C032031826-00036 C032031826-00022 C032031826-00071 C0320B1830-00158 C032031826-00086)
fi

for gw in ${gateways[@]}; do
    echo "configuring $gw as $email"
    rigado gateway configure $gw --filename $config -i $email
done
