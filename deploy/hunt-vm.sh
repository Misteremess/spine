#!/usr/bin/env bash
# Caza una VM Always Free en Oracle cuando no hay capacidad (error habitual
# en regiones saturadas). Intenta la A1.Flex (2 OCPU/12 GB) cada ~2 min;
# con HUNT_MICRO=1 prueba también la E2.1.Micro uno de cada cinco intentos.
#
# Requiere la OCI CLI configurada (~/.oci/config) y una clave SSH en
# ~/.ssh/spine_oracle.pub. Uso recomendado (evita que el Mac se duerma):
#   caffeinate -i bash deploy/hunt-vm.sh
set -uo pipefail

DISPLAY_NAME="spine-api"
SSH_KEY_FILE="$HOME/.ssh/spine_oracle.pub"
SLEEP_SECONDS="${HUNT_SLEEP:-115}"
HUNT_MICRO="${HUNT_MICRO:-0}"

say_notify() {
  osascript -e "display notification \"$1\" with title \"Spine — caza de VM\"" 2>/dev/null || true
  say "$1" 2>/dev/null || true
}

[ -f "$SSH_KEY_FILE" ] || { echo "Falta $SSH_KEY_FILE"; exit 1; }
command -v oci >/dev/null || { echo "Falta la OCI CLI (brew install oci-cli)"; exit 1; }

TENANCY=$(awk -F= '/^tenancy/{gsub(/ /,"",$2); print $2; exit}' ~/.oci/config)
[ -n "$TENANCY" ] || { echo "No encuentro el tenancy en ~/.oci/config"; exit 1; }

echo "== Descubriendo recursos de la cuenta =="
AD=$(oci iam availability-domain list --compartment-id "$TENANCY" \
  --query 'data[0].name' --raw-output)
SUBNET=$(oci network subnet list --compartment-id "$TENANCY" \
  --query 'data[0].id' --raw-output 2>/dev/null)
[ -n "${SUBNET:-}" ] || {
  echo "No hay ninguna subred: crea la VCN desde la consola (o un intento fallido del asistente la deja creada)"
  exit 1
}

image_for() {
  oci compute image list --compartment-id "$TENANCY" \
    --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
    --shape "$1" --sort-by TIMECREATED --sort-order DESC \
    --query 'data[0].id' --raw-output
}
IMG_ARM=$(image_for "VM.Standard.A1.Flex")
IMG_X86=$(image_for "VM.Standard.E2.1.Micro")
SSH_KEY=$(cat "$SSH_KEY_FILE")

echo "AD: $AD"
echo "Subred: $SUBNET"
echo "Ubuntu ARM: $IMG_ARM · Ubuntu x86: $IMG_X86"

# Si ya existe (cazada a mano o en una ejecución anterior), no duplicar.
# Ojo: con cero instancias la CLI no imprime nada — vacío significa 0.
existing() {
  local n
  n=$(oci compute instance list --compartment-id "$TENANCY" \
    --query "length(data[?\"display-name\"=='$DISPLAY_NAME' && \"lifecycle-state\"!='TERMINATED'])" \
    --raw-output 2>/dev/null)
  echo "${n:-0}"
}
if [ "$(existing)" -gt 0 ] 2>/dev/null; then
  echo "Ya existe una instancia '$DISPLAY_NAME'. Nada que cazar."
  exit 0
fi

try_launch() { # $1 shape · $2 image · $3 shape-config json ("" si no aplica)
  local args=(compute instance launch
    --availability-domain "$AD" --compartment-id "$TENANCY"
    --shape "$1" --image-id "$2" --subnet-id "$SUBNET"
    --assign-public-ip true --display-name "$DISPLAY_NAME"
    --metadata "{\"ssh_authorized_keys\": \"$SSH_KEY\"}")
  [ -n "$3" ] && args+=(--shape-config "$3")
  oci "${args[@]}" 2>&1
}

attempt=0
while true; do
  attempt=$((attempt + 1))
  stamp=$(date "+%H:%M:%S")

  out=$(try_launch "VM.Standard.A1.Flex" "$IMG_ARM" '{"ocpus":2,"memoryInGBs":12}')
  if echo "$out" | grep -q '"lifecycle-state"'; then
    shape="A1.Flex (2 OCPU / 12 GB)"
    break
  fi
  echo "[$stamp · intento $attempt] A1.Flex: $(echo "$out" | grep -o 'Out of capacity[^"]*\|LimitExceeded\|TooManyRequests' | head -1 || echo "sin hueco")"

  if [ "$HUNT_MICRO" = "1" ] && [ $((attempt % 5)) -eq 0 ]; then
    out=$(try_launch "VM.Standard.E2.1.Micro" "$IMG_X86" "")
    if echo "$out" | grep -q '"lifecycle-state"'; then
      shape="E2.1.Micro (1 OCPU / 1 GB)"
      break
    fi
    echo "[$stamp · intento $attempt] E2.1.Micro: sin hueco tampoco"
  fi

  sleep "$SLEEP_SECONDS"
done

INSTANCE_ID=$(echo "$out" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')
echo "🎉 ¡Instancia creada! ($shape) Esperando a RUNNING…"
say_notify "VM cazada: $shape"

for _ in $(seq 1 60); do
  state=$(oci compute instance get --instance-id "$INSTANCE_ID" \
    --query 'data."lifecycle-state"' --raw-output)
  [ "$state" = "RUNNING" ] && break
  sleep 10
done

PUBLIC_IP=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" \
  --query 'data[0]."public-ip"' --raw-output)

echo
echo "=================================================="
echo "  VM $DISPLAY_NAME lista ($shape)"
echo "  IP pública: $PUBLIC_IP"
echo "  Entrar:     ssh -i ~/.ssh/spine_oracle ubuntu@$PUBLIC_IP"
echo "=================================================="
say_notify "La VM de Spine está lista, IP $PUBLIC_IP"
