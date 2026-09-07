#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "→ Installing Node 20 LTS..."
nvm install 20
nvm use 20
nvm alias default 20

echo ""
echo "✓ Node: $(node --version)"
echo "✓ npm:  $(npm --version)"
echo ""
echo "→ Adding nvm auto-load to ~/.zshrc (if not already present)..."
if ! grep -q 'NVM_DIR' ~/.zshrc; then
  cat >> ~/.zshrc << 'ZSHBLOCK'

# nvm — Node Version Manager
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
ZSHBLOCK
  echo "✓ Added nvm to ~/.zshrc"
else
  echo "✓ nvm already in ~/.zshrc"
fi

echo ""
echo "All done! Node is ready in WSL."
