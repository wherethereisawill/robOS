import { Card, CardContent} from "@/components/ui/card";
import { Button } from "./ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { getToken, setToken, removeToken } from "@/utils/token";
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
export function TokenConfig() {
    const [token, setTokenState] = useState<string | null>(getToken());
    const [tokenInput, setTokenInput] = useState("");

    const handleTokenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setToken(tokenInput);
        setTokenState(tokenInput);
        setTokenInput("");
    };

    const handleRemoveToken = () => {
        removeToken();
        setTokenState(null);
    };

    return (
        <div>
            <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Tokens</h2>
            <Card>
                <CardContent>
                    {token ? (
                        <div>
                            <div className="flex items-center gap-4">
                                <Label className="whitespace-nowrap">Hugging Face</Label>
                                <Input
                                    type="password"
                                    value="hf_•••••••••••••••••••••••••••••••••••••"
                                    disabled
                                    className="flex-1"
                                />
                                <Button variant="outline" onClick={handleRemoveToken} size="icon" className="shrink-0">
                                    <Trash2 />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleTokenSubmit} className="flex items-center gap-4">
                            <Label className="whitespace-nowrap">Hugging Face</Label>
                            <Input
                                type="password"
                                placeholder="Enter your token here..."
                                value={tokenInput}
                                onChange={(e) => setTokenInput(e.target.value)}
                                className="flex-1"
                            />
                            <Button variant="outline" type="submit" className="shrink-0" disabled={!tokenInput}>
                                Save
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 