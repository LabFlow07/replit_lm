              {/* Informazioni Assegnazione - Modalità Modifica per Superadmin */}
              {isClassifyDialogOpen && user?.role === 'superadmin' && (
                <form onSubmit={handleSubmit(onClassifySubmit)} className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Modifica Assegnazioni</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Azienda */}
                      <div>
                        <Label htmlFor="aziendaAssegnata" className="text-sm font-medium">Azienda</Label>
                        <Select
                          value={watch('aziendaAssegnata') || ''}
                          onValueChange={(value) => {
                            setValue('aziendaAssegnata', value || null);
                            setValue('clienteAssegnato', null);
                            setValue('licenzaAssegnata', null);
                            setValue('prodottoAssegnato', null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona azienda..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nessuna azienda</SelectItem>
                            {safeCompanies.map((company: any) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name} - {company.partitaIva || 'N/A'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Cliente */}
                      <div>
                        <Label htmlFor="clienteAssegnato" className="text-sm font-medium">Cliente</Label>
                        {watch('aziendaAssegnata') ? (
                          <Select
                            value={watch('clienteAssegnato') || ''}
                            onValueChange={(value) => {
                              setValue('clienteAssegnato', value || null);
                              setValue('licenzaAssegnata', null);
                              setValue('prodottoAssegnato', null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Nessun cliente</SelectItem>
                              {safeClients.filter((client: any) => 
                                (client.company_id || client.companyId) === watch('aziendaAssegnata')
                              ).map((client: any) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} - {client.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-md border text-center">
                            <p className="text-sm text-gray-500">Seleziona prima un'azienda</p>
                          </div>
                        )}
                      </div>

                      {/* Licenza */}
                      <div>
                        <Label htmlFor="licenzaAssegnata" className="text-sm font-medium">Licenza</Label>
                        {watch('clienteAssegnato') ? (
                          <Select
                            value={watch('licenzaAssegnata') || ''}
                            onValueChange={(value) => {
                              setValue('licenzaAssegnata', value || null);
                              if (value) {
                                const selectedLicense = safeLicenses.find((l: License) => l.id === value);
                                if (selectedLicense?.product) {
                                  setValue('prodottoAssegnato', selectedLicense.product.name);
                                }
                              } else {
                                setValue('prodottoAssegnato', null);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona licenza..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Nessuna licenza</SelectItem>
                              {safeLicenses.filter((license: License) => {
                                const clientId = watch('clienteAssegnato');
                                return license.client?.id === clientId && license.status === 'attiva';
                              }).map((license: License) => (
                                <SelectItem key={license.id} value={license.id}>
                                  <div className="flex flex-col">
                                    <span className="font-mono text-xs">{license.activationKey}</span>
                                    <span className="text-xs text-gray-600">
                                      {license.product?.name} ({license.status})
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-md border text-center">
                            <p className="text-sm text-gray-500">Seleziona prima un cliente</p>
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div>
                        <Label htmlFor="note" className="text-sm font-medium">Note</Label>
                        <Textarea
                          id="note"
                          {...register('note')}
                          placeholder="Aggiungi note..."
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    </div>

                    {/* Autorizzazione dispositivo */}
                    {watch('licenzaAssegnata') && !selectedRegistration?.computerKey && (
                      <div className="flex items-center space-x-2 pt-3 border-t">
                        <input
                          type="checkbox"
                          id="authorizeDevice"
                          {...register('authorizeDevice')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="authorizeDevice" className="text-sm font-medium">
                          Autorizza dispositivo (genera computer key)
                        </Label>
                      </div>
                    )}

                    {/* Device già autorizzato */}
                    {selectedRegistration?.computerKey && (
                      <div className="flex items-center space-x-2 pt-3 border-t bg-green-50 p-3 rounded-md">
                        <div className="h-4 w-4 text-green-600">🔑</div>
                        <span className="text-sm text-green-800 font-medium">
                          Dispositivo già autorizzato: {selectedRegistration.computerKey.substring(0, 20)}...
                        </span>
                      </div>
                    )}

                    {/* Pulsanti */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="flex gap-2">
                        {selectedRegistration?.licenzaAssegnata && (
                          <>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm('Rimuovere l\'assegnazione della licenza?')) {
                                  classifyMutation.mutate({
                                    aziendaAssegnata: null,
                                    clienteAssegnato: null,
                                    licenzaAssegnata: null,
                                    prodottoAssegnato: null,
                                    note: watch('note'),
                                    authorizeDevice: false
                                  });
                                }
                              }}
                            >
                              Rimuovi Assegnazione
                            </Button>
                            {selectedRegistration?.computerKey && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Rimuovere solo il Computer Key?')) {
                                    classifyMutation.mutate({
                                      aziendaAssegnata: watch('aziendaAssegnata'),
                                      clienteAssegnato: watch('clienteAssegnato'),
                                      licenzaAssegnata: watch('licenzaAssegnata'),
                                      prodottoAssegnato: watch('prodottoAssegnato'),
                                      note: watch('note'),
                                      authorizeDevice: false
                                    });
                                  }
                                }}
                              >
                                Rimuovi Computer Key
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsClassifyDialogOpen(false);
                            setSelectedRegistration(null);
                            reset();
                          }}
                        >
                          Annulla
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Salvando...' : 'Salva Modifiche'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              )}